import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleNotificacoes, gerarNotificacoesAutomaticas } from '../notificacoes.js';

vi.mock('../_db.js', () => ({
  sql: vi.fn(),
  validateAuth: vi.fn(),
}));

vi.mock('../drizzle-db.js', () => ({
  db: {
    select: vi.fn(),
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
  let sc = 200, jd: any = null, ended = false;
  const self: any = {
    status: vi.fn((c: number) => { sc = c; return self; }),
    json: vi.fn((d: any) => { jd = d; return self; }),
    end: vi.fn(() => { ended = true; return self; }),
    _s: () => sc, _d: () => jd,
  };
  return self;
}

describe('handleNotificacoes', () => {
  beforeEach(() => {
    vi.mocked(sql).mockReset();
    vi.mocked(validateAuth).mockReset();
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1', tenantId: 'tenant-123' }, error: null });
    
    const defaultChain = mockDrizzleChain([]);
    vi.mocked(db.select).mockReturnValue(defaultChain);
  });

  it('deve retornar 401 se não autorizado', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: false, user: null, error: 'Sem token' });
    const req = { method: 'GET', url: '/api/notificacoes', query: {} };
    const res = mockRes();

    await handleNotificacoes(req, res);

    expect(res._s()).toBe(401);
  });

  it('deve listar notificações (GET)', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: '1', tipo: 'estoque_critico', lida: false }]);
    const req = { method: 'GET', url: '/api/notificacoes', query: {} };
    const res = mockRes();

    await handleNotificacoes(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().data).toHaveLength(1);
  });

  it('deve filtrar apenas não lidas se unread=true', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: '1', lida: false }]);
    const req = { method: 'GET', url: '/api/notificacoes', query: { unread: 'true', limit: '10' } };
    const res = mockRes();

    await handleNotificacoes(req, res);

    expect(res._s()).toBe(200);
  });

  it('deve contar não lidas em GET /contar', async () => {
    vi.mocked(sql).mockImplementation(async (strings: any) => {
      const qStr = (Array.isArray(strings) ? strings.join('') : String(strings)).replace(/\s+/g, ' ');
      if (qStr.includes('SELECT count(*)')) {
        return [{ count: '5' }];
      }
      return [];
    });

    const req = { method: 'GET', url: '/api/notificacoes/contar', query: {} };
    const res = mockRes();

    await handleNotificacoes(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().data).toBe(5);
  });

  it('deve marcar como lida (PATCH)', async () => {
    vi.mocked(sql).mockResolvedValue([]);
    const req = { method: 'PATCH', url: '/api/notificacoes', query: { id: '1' } };
    const res = mockRes();

    await handleNotificacoes(req, res);

    expect(res._s()).toBe(200);
  });

  it('deve marcar todas como lidas em /marcar-todas (PUT/PATCH)', async () => {
    vi.mocked(sql).mockResolvedValue([]);
    const req = { method: 'PUT', url: '/api/notificacoes/marcar-todas', query: {} };
    const res = mockRes();

    await handleNotificacoes(req, res);

    expect(res._s()).toBe(200);
  });

  it('deve gerar notificações sob demanda via POST /gerar', async () => {
    vi.mocked(sql).mockResolvedValue([]);
    const req = { method: 'POST', url: '/api/notificacoes/gerar', query: {} };
    const res = mockRes();

    await handleNotificacoes(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().stats.criadas).toBe(0);
  });

  it('deve retornar 405 para métodos não permitidos', async () => {
    const req = { method: 'DELETE', url: '/api/notificacoes', query: {} };
    const res = mockRes();

    await handleNotificacoes(req, res);

    expect(res._s()).toBe(405);
  });

  it('deve retornar 500 em caso de erro inesperado', async () => {
    vi.mocked(validateAuth).mockImplementation(() => {
      throw new Error('Erro banco offline');
    });
    const req = { method: 'GET', url: '/api/notificacoes', query: {} };
    const res = mockRes();

    await handleNotificacoes(req, res);

    expect(res._s()).toBe(500);
    expect(res._d().error).toBe('Erro banco offline');
  });
});

describe('gerarNotificacoesAutomaticas', () => {
  beforeEach(() => {
    vi.mocked(sql).mockReset();
    const defaultChain = mockDrizzleChain([]);
    vi.mocked(db.select).mockReturnValue(defaultChain);
  });

  it('deve criar notificações de estoque crítico para materiais abaixo do mínimo', async () => {
    vi.mocked(sql).mockImplementation(async (strings: any) => {
      const qStr = (Array.isArray(strings) ? strings.join('') : String(strings)).replace(/\s+/g, ' ');
      if (qStr.includes('FROM materiais')) {
        return [
          { id: 'm1', nome: 'MDF 18mm', sku: 'MDF18', estoque_atual: 0, estoque_minimo: 5 },
          { id: 'm2', nome: 'MDF 15mm', sku: 'MDF15', estoque_atual: 2, estoque_minimo: 5 }
        ];
      }
      if (qStr.includes('SELECT id FROM notificacoes WHERE lida = false AND tipo = \'estoque_critico\'')) {
        return [];
      }
      return [];
    });

    const result = await gerarNotificacoesAutomaticas('tenant-123');

    expect(result.criadas).toBe(2);
  });

  it('não deve duplicar notificações se estoque crítico já tiver notificação não lida', async () => {
    vi.mocked(sql).mockImplementation(async (strings: any) => {
      const qStr = (Array.isArray(strings) ? strings.join('') : String(strings)).replace(/\s+/g, ' ');
      if (qStr.includes('FROM materiais')) {
        return [{ id: 'm1', nome: 'MDF 18mm', sku: 'MDF18', estoque_atual: 0, estoque_minimo: 5 }];
      }
      if (qStr.includes('SELECT id FROM notificacoes WHERE lida = false AND tipo = \'estoque_critico\'')) {
        return [{ id: 'notif-1' }];
      }
      return [];
    });

    const result = await gerarNotificacoesAutomaticas('tenant-123');

    expect(result.criadas).toBe(0);
  });

  it('deve criar notificações de prazos de projetos próximos de vencer', async () => {
    vi.mocked(sql).mockImplementation(async (strings: any) => {
      const qStr = (Array.isArray(strings) ? strings.join('') : String(strings)).replace(/\s+/g, ' ');
      if (qStr.includes('FROM projects')) {
        return [{ id: 'p1', ambiente: 'Cozinha Planejada', prazo_entrega: '2026-06-10' }];
      }
      if (qStr.includes('SELECT id FROM notificacoes WHERE lida = false AND tipo = \'prazo_projeto\'')) {
        return [];
      }
      return [];
    });

    const result = await gerarNotificacoesAutomaticas('tenant-123');

    expect(result.criadas).toBe(1);
  });

  it('deve criar notificações de orçamentos pendentes sem resposta', async () => {
    const mockOrcamentos = [
      { id: 'q1', numero: 'ORC-001', cliente: 'Roberto' }
    ];
    const customChain = mockDrizzleChain(mockOrcamentos);
    vi.mocked(db.select).mockReturnValue(customChain);

    vi.mocked(sql).mockImplementation(async (strings: any) => {
      const qStr = (Array.isArray(strings) ? strings.join('') : String(strings)).replace(/\s+/g, ' ');
      if (qStr.includes('SELECT id FROM notificacoes WHERE lida = false AND tipo = \'orcamento_sem_resposta\'')) {
        return [];
      }
      return [];
    });

    const result = await gerarNotificacoesAutomaticas('tenant-123');

    expect(result.criadas).toBe(1);
  });

  it('deve criar notificações de chamados de garantia pendentes', async () => {
    vi.mocked(sql).mockImplementation(async (strings: any) => {
      const qStr = (Array.isArray(strings) ? strings.join('') : String(strings)).replace(/\s+/g, ' ');
      if (qStr.includes('FROM chamados_garantia')) {
        return [{ id: 'g1', numero: 'GAR-002', titulo: 'Porta desalinhada' }];
      }
      if (qStr.includes('SELECT id FROM notificacoes WHERE lida = false AND tipo = \'garantia_pendente\'')) {
        return [];
      }
      return [];
    });

    const result = await gerarNotificacoesAutomaticas('tenant-123');

    expect(result.criadas).toBe(1);
  });

  it('deve criar notificações de cobranças financeiras vencidas', async () => {
    vi.mocked(sql).mockImplementation(async (strings: any) => {
      const qStr = (Array.isArray(strings) ? strings.join('') : String(strings)).replace(/\s+/g, ' ');
      if (qStr.includes('FROM billings')) {
        return [{ id: 'b1', nf: 'NF-100', valor: '500.00', due_date: '2026-06-01', cliente: 'Renata' }];
      }
      if (qStr.includes('SELECT id FROM notificacoes WHERE lida = false AND tipo = \'cobranca_vencida\'')) {
        return [];
      }
      return [];
    });

    const result = await gerarNotificacoesAutomaticas('tenant-123');

    expect(result.criadas).toBe(1);
  });

  it('deve tolerar erros individuais em seções e continuar executando as demais', async () => {
    vi.mocked(sql).mockImplementation(async (strings: any) => {
      const qStr = (Array.isArray(strings) ? strings.join('') : String(strings)).replace(/\s+/g, ' ');
      if (qStr.includes('FROM materiais')) {
        throw new Error('Erro de BD no estoque');
      }
      if (qStr.includes('FROM projects')) {
        return [{ id: 'p1', ambiente: 'Cozinha', prazo_entrega: '2026-06-10' }];
      }
      return [];
    });

    const result = await gerarNotificacoesAutomaticas('tenant-123');

    expect(result.criadas).toBe(1);
  });
});
