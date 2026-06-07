import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleEstoqueGranular } from '../estoque-granular.js';

vi.mock('../_db.js', () => ({
  sql: vi.fn(),
  validateAuth: vi.fn(),
}));

vi.mock('../middleware/tenantMiddleware.js', () => ({
  withTenant: (handler: any) => handler,
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

const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000000';
const TEST_USER = { id: 'u1', tenantId: TEST_TENANT_ID, role: 'admin', email: 't@e.com', name: 'Tester' };

function mockReq(overrides: any = {}): any {
  return {
    method: 'GET',
    headers: {},
    body: {},
    query: {},
    tenantId: TEST_TENANT_ID,
    tenantUser: TEST_USER,
    ...overrides,
  };
}

describe('handleEstoqueGranular', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({
      authorized: true,
      user: { id: 'u1', name: 'Alocado', tenantId: '00000000-0000-0000-0000-000000000000' },
      error: null
    });
  });

  it.skip('deve retornar 401 se não estiver autenticado', async () => {
    // Auth handled by withTenant HOF (see tenantMiddleware.test.ts).
  });

  it('deve listar itens de estoque granular (GET /items)', async () => {
    vi.mocked(sql).mockImplementation(async (query: any, ...params: any[]) => {
      return [
        { sku_codigo: 'MDF-BRA-15', descricao: 'MDF BRANCO 15MM', quantidade_disponivel: 45, quantidade_em_transito: 10, quantidade_provisionado: 5, quantidade_defeituoso: 2, quantidade_vencido: 0, quantidade_total: 62, status_alerta: 'ok' }
      ];
    });

    const req = mockReq({ method: 'GET', url: '/items', query: { filtro: 'todos' }, body: {} });
    const res = mockRes();
    await handleEstoqueGranular(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    expect(res._d().items).toHaveLength(1);
    expect(res._d().items[0].sku_codigo).toBe('MDF-BRA-15');
  });

  it('deve listar alertas de estoque ativos (GET /alertas)', async () => {
    vi.mocked(sql).mockResolvedValue([
      { id: 1, sku_codigo: 'MDF-BRA-18', tipo_alerta: 'minimo_atingido', quantidade_atual: 8, limite_alerta: 15, severidade: 'alerta', descricao: 'MDF BRANCO 18MM' }
    ] as any);

    const req = mockReq({ method: 'GET', url: '/alertas', query: {}, body: {} });
    const res = mockRes();
    await handleEstoqueGranular(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    expect(res._d().alertas).toHaveLength(1);
    expect(res._d().alertas[0].tipo_alerta).toBe('minimo_atingido');
  });

  it('deve registrar movimentação e recalcular total (POST /registrar-movimento)', async () => {
    vi.mocked(sql).mockImplementation(async (query: any, ...params: any[]) => {
      let qStr = '';
      if (typeof query === 'string') {
        qStr = query;
      } else if (Array.isArray(query)) {
        qStr = query.join('?');
      } else if (query && typeof query === 'object' && 'strings' in query) {
        qStr = (query.strings as string[]).join('?');
      }

      if (qStr.includes('SELECT * FROM estoque_materiais_detalhado')) {
        return [{ sku_codigo: 'MDF-BRA-15', quantidade_disponivel: 45, preco_custo_unitario: '150.00' }];
      }
      if (qStr.includes('SELECT (quantidade_disponivel')) {
        return [{ total: 47 }];
      }
      return [];
    });

    const req = mockReq({
      method: 'POST',
      url: '/registrar-movimento',
      query: {},
      body: {
        sku_codigo: 'MDF-BRA-15',
        tipo_movimento: 'entrada_compra',
        quantidade: 2,
        status_alvo: 'disponivel',
        motivo: 'Recebimento de nota fiscal de compra'
      }
    });
    const res = mockRes();
    await handleEstoqueGranular(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    expect(res._d().saldo_novo).toBe(47);
  });

  it('deve consumir provisionados ao concluir OP (POST /finalizar-op)', async () => {
    const orcChain = mockDrizzleChain([{ materiais_consumidos: [{ sku: 'MDF-BRA-15', quantidade: 5 }] }]);
    vi.mocked(db.select).mockReturnValueOnce(orcChain);

    vi.mocked(sql).mockImplementation(async (query: any, ...params: any[]) => {
      let qStr = '';
      if (typeof query === 'string') {
        qStr = query;
      } else if (Array.isArray(query)) {
        qStr = query.join('?');
      } else if (query && typeof query === 'object' && 'strings' in query) {
        qStr = (query.strings as string[]).join('?');
      }

      if (qStr.includes('FROM ordens_prod')) {
        return [{ id: 'op-1', quotation_id: 'orc-1' }];
      }
      if (qStr.includes('FROM estoque_materiais_detalhado')) {
        return [{ quantidade_provisionado: 5, quantidade_disponivel: 45 }];
      }
      return [];
    });

    const req = mockReq({
      method: 'POST',
      url: '/finalizar-op',
      query: {},
      body: { operacao_prod_id: 'op-1' }
    });
    const res = mockRes();
    await handleEstoqueGranular(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    expect(res._d().resultados).toBeDefined();
    expect(res._d().resultados[0].sku).toBe('MDF-BRA-15');
  });

  it('deve fazer SKU matching em lote exato e fuzzy (POST /sku-matching)', async () => {
    vi.mocked(sql).mockImplementation(async (query: any, ...params: any[]) => {
      let qStr = '';
      if (typeof query === 'string') {
        qStr = query;
      } else if (Array.isArray(query)) {
        qStr = query.join('?');
      } else if (query && typeof query === 'object' && 'strings' in query) {
        qStr = (query.strings as string[]).join('?');
      }

      if (qStr.includes('mapeamento_sku')) {
        return [];
      }
      if (qStr.includes('estoque_materiais_detalhado')) {
        return [
          { sku_codigo: 'MDF-BRA-15', descricao: 'MDF BRANCO 15MM', quantidade_disponivel: 45, preco_custo_unitario: '150.00' }
        ];
      }
      return [];
    });

    const req = mockReq({
      method: 'POST',
      url: '/sku-matching',
      query: {},
      body: {
        quotation_id: 'orc-1',
        itens_csv: [
          { sku_promob: 'MDF-BRA-15', descricao: 'MDF BRANCO 15MM', quantidade: 3 },
          { sku_promob: 'MDF-BRANCO-15', descricao: 'MDF BRANQUINHO 15MM', quantidade: 2 }
        ]
      }
    });
    const res = mockRes();
    await handleEstoqueGranular(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    expect(res._d().resultados).toHaveLength(2);
    expect(res._d().resultados[0].sku_selecionado).toBe('MDF-BRA-15'); // exato
    expect(res._d().resultados[1].sku_selecionado).toBe('MDF-BRA-15'); // fuzzy
  });
});
