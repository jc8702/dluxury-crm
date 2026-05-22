import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleNotificacoes, gerarNotificacoesAutomaticas } from '../notificacoes.js';

vi.mock('../_db.js', () => ({
  sql: vi.fn(),
  validateAuth: vi.fn(),
}));

const { sql, validateAuth } = await import('../_db.js');

function mockRes() {
  let sc = 200, jd: any = null;
  const self: any = {
    status: vi.fn((c: number) => { sc = c; return self; }),
    json: vi.fn((d: any) => { jd = d; return self; }),
    end: vi.fn(() => self),
    _s: () => sc, _d: () => jd,
  };
  return self;
}

describe('handleNotificacoes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null });
  });

  it('deve listar notificações (GET)', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: '1', tipo: 'estoque_critico', lida: false }]);
    const req = { method: 'GET', url: '/api/notificacoes', query: {} };
    const res = mockRes();
    await handleNotificacoes(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().data).toHaveLength(1);
  });

  it('deve filtrar apenas não lidas', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: '1', lida: false }]);
    const req = { method: 'GET', url: '/api/notificacoes', query: { unread: 'true' } };
    const res = mockRes();
    await handleNotificacoes(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve contar não lidas', async () => {
    vi.mocked(sql).mockImplementation(() => Promise.resolve([]));
    vi.mocked(sql).mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValue([{ count: '0' }]);
    const req = { method: 'GET', url: '/api/notificacoes/contar', query: {} };
    const res = mockRes();
    await handleNotificacoes(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve marcar como lida (PATCH)', async () => {
    vi.mocked(sql).mockResolvedValue([]);
    const req = { method: 'PATCH', url: '/api/notificacoes', query: { id: '1' } };
    const res = mockRes();
    await handleNotificacoes(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve marcar todas como lidas', async () => {
    vi.mocked(sql).mockResolvedValue([]);
    const req = { method: 'PATCH', url: '/api/notificacoes/marcar-todas', query: {} };
    const res = mockRes();
    await handleNotificacoes(req, res);
    expect(res._s()).toBe(200);
  });
});

describe('gerarNotificacoesAutomaticas', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deve retornar { criadas: 0 } quando não há pendências', async () => {
    vi.mocked(sql).mockResolvedValue([]);
    const result = await gerarNotificacoesAutomaticas();
    expect(result.criadas).toBe(0);
  });

  it('deve criar notificação de estoque crítico', async () => {
    vi.mocked(sql)
      .mockResolvedValueOnce([{ id: '1', nome: 'Parafuso', sku: 'PAR-01', estoque_atual: 0, estoque_minimo: 10 }])
      .mockResolvedValueOnce([]) // exists check
      .mockResolvedValueOnce([]) // INSERT
      .mockResolvedValue([]); // remaining queries
    const result = await gerarNotificacoesAutomaticas();
    expect(result.criadas).toBe(1);
  });
});
