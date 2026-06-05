import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleContratoDigital } from '../contrato-digital.js';

vi.mock('../_db.js', () => ({
  sql: vi.fn(),
  validateAuth: vi.fn(),
}));

vi.mock('../drizzle-db.js', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  }
}));

const { sql, validateAuth } = await import('../_db.js');
const { db } = await import('../drizzle-db.js');

function mockDrizzleChain(resolveValue: any = []) {
  const chain: any = {};
  const methods = ['select', 'from', 'leftJoin', 'innerJoin', 'where', 'limit', 'orderBy', 'update', 'set', 'returning'];
  methods.forEach(method => {
    chain[method] = vi.fn().mockImplementation(() => chain);
  });
  chain.then = vi.fn().mockImplementation((onFulfilled) => {
    return Promise.resolve(resolveValue).then(onFulfilled);
  });
  return chain;
}

function mockRes() {
  let sc = 200, jd: any = null;
  const self: any = {
    status: vi.fn((c: number) => { sc = c; return self; }),
    json: vi.fn((d: any) => { jd = d; return self; }),
    end: vi.fn(() => self),
    _s: () => sc,
    _d: () => jd,
  };
  return self;
}

describe('handleContratoDigital', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({
      authorized: true,
      user: { id: 'u1', name: 'Alocado', tenantId: '00000000-0000-0000-0000-000000000000' },
      error: null
    });
  });

  it('deve retornar status do contrato (GET /status)', async () => {
    vi.mocked(sql).mockImplementation(async (query: any, ...params: any[]) => {
      let qStr = '';
      if (typeof query === 'string') {
        qStr = query;
      } else if (Array.isArray(query)) {
        qStr = query.join('?');
      } else if (query && typeof query === 'object' && 'strings' in query) {
        qStr = (query.strings as string[]).join('?');
      }

      if (qStr.includes('FROM contrato_digital')) {
        return [{ id: 1, quotation_id: 'orc-1', numero_contrato: 'CONT-1', status_assinatura: 'pendente' }];
      }
      if (qStr.includes('FROM historico_assinatura_digital')) {
        return [{ id: 10, contrato_id: 1, acao: 'contrato_gerado', detalhes: 'Emitido' }];
      }
      return [];
    });

    const req = { method: 'GET', url: '/status', query: { quotation_id: 'orc-1' }, body: {} };
    const res = mockRes();
    await handleContratoDigital(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    expect(res._d().contrato).toBeDefined();
    expect(res._d().contrato.numero_contrato).toBe('CONT-1');
    expect(res._d().historico).toHaveLength(1);
  });

  it('deve gerar e enviar novo contrato (POST /gerar-e-enviar)', async () => {
    const orcChain = mockDrizzleChain([{ id: 'orc-1', numeroOrcamento: 'ORC-2026-001', clienteId: 5, valorTotalVenda: '25000.00', prazoEntregaDias: 45, status: 'RASCUNHO' }]);
    const itensChain = mockDrizzleChain([{ id: 'item-1', quotationId: 'orc-1', skuCodigo: 'MDF-BRA-15', quantidade: '5', precoVendaUnitario: '5000.00' }]);
    vi.mocked(db.select).mockReturnValueOnce(orcChain).mockReturnValueOnce(itensChain);

    vi.mocked(sql).mockImplementation(async (query: any, ...params: any[]) => {
      let qStr = '';
      if (typeof query === 'string') {
        qStr = query;
      } else if (Array.isArray(query)) {
        qStr = query.join('?');
      } else if (query && typeof query === 'object' && 'strings' in query) {
        qStr = (query.strings as string[]).join('?');
      }

      if (qStr.includes('FROM clients')) {
        return [{ id: 5, nome: 'Cliente Teste CPF', cpf: '123.456.789-00' }];
      }
      if (qStr.includes('SELECT id FROM contrato_digital')) {
        return [];
      }
      if (qStr.includes('INSERT INTO contrato_digital')) {
        return [{ id: 1 }];
      }
      return [];
    });

    const req = {
      method: 'POST',
      url: '/gerar-e-enviar',
      query: {},
      body: { quotation_id: 'orc-1' }
    };
    const res = mockRes();
    await handleContratoDigital(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    expect(res._d().contrato_id).toBe(1);
    expect(res._d().numero_contrato).toContain('CONT-ORC-2026-001');
    expect(res._d().url_assinatura).toBeDefined();
  });

  it('deve processar assinatura concluída via webhook e provisionar estoque (POST /webhook-assinatura)', async () => {
    let sqlQueries: string[] = [];

    const orcChain = mockDrizzleChain([{ id: 'orc-1', numeroOrcamento: 'ORC-2026-001', status: 'RASCUNHO', prazoEntregaDias: 45 }]);
    const updateOrcChain = mockDrizzleChain([]);
    const itensChain = mockDrizzleChain([{ id: 'item-1', skuCodigo: 'MDF-BRA-15', quantidade: '5' }]);
    
    vi.mocked(db.select).mockReturnValueOnce(orcChain).mockReturnValueOnce(itensChain);
    vi.mocked(db.update).mockReturnValueOnce(updateOrcChain);

    vi.mocked(sql).mockImplementation(async (query: any, ...params: any[]) => {
      let qStr = '';
      if (typeof query === 'string') {
        qStr = query;
      } else if (Array.isArray(query)) {
        qStr = query.join('?');
      } else if (query && typeof query === 'object' && 'strings' in query) {
        qStr = (query.strings as string[]).join('?');
      }

      sqlQueries.push(qStr);

      if (qStr.includes('FROM contrato_digital')) {
        return [{ id: 1, quotation_id: 'orc-1', numero_contrato: 'CONT-1', status_assinatura: 'pendente', id_assinatura_externa: 'env-1' }];
      }
      if (qStr.includes('INSERT INTO ordens_prod')) {
        return [{ id: 'new-op-uuid' }];
      }
      if (qStr.includes('FROM estoque_materiais_detalhado')) {
        return [{ quantidade_disponivel: 45, quantidade_provisionado: 5 }];
      }
      return [];
    });

    const req = {
      method: 'POST',
      url: '/webhook-assinatura',
      query: {},
      body: { envelope_id: 'env-1', status: 'completed' }
    };
    const res = mockRes();
    await handleContratoDigital(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    
    // Validar atualizações do banco
    expect(sqlQueries.some(q => q.includes('UPDATE contrato_digital'))).toBe(true);
    expect(db.update).toHaveBeenCalled();
    expect(sqlQueries.some(q => q.includes('INSERT INTO ordens_prod'))).toBe(true);
    expect(sqlQueries.some(q => q.includes('INSERT INTO etapas_prod_kanban'))).toBe(true);
    expect(sqlQueries.some(q => q.includes('UPDATE estoque_materiais_detalhado'))).toBe(true);
    expect(sqlQueries.some(q => q.includes('INSERT INTO movimento_estoque_granular'))).toBe(true);
  });
});
