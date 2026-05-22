import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleOrcamentos, handleCondicoesPagamento } from '../orcamentos.js';

vi.mock('../_db.js', () => ({
  sql: vi.fn(),
  validateAuth: vi.fn(),
  auditLog: vi.fn(),
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

describe('handleOrcamentos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null });
  });

  it('deve listar orçamentos (GET)', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: '1', numero: 'PRO-2026-001' }]);
    const req = { method: 'GET', query: {} };
    const res = mockRes();
    await handleOrcamentos(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().data).toHaveLength(1);
  });

  it('deve buscar orçamento por id (GET ?id=X)', async () => {
    vi.mocked(sql)
      .mockResolvedValueOnce([{ id: '1', numero: 'PRO-2026-001' }])
      .mockResolvedValueOnce([{ id: '1', descricao: 'Item A' }]);
    const req = { method: 'GET', query: { id: '1' } };
    const res = mockRes();
    await handleOrcamentos(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().data.itens).toBeDefined();
  });

  it('deve retornar 404 se orçamento não encontrado', async () => {
    vi.mocked(sql).mockResolvedValue([]);
    const req = { method: 'GET', query: { id: '999' } };
    const res = mockRes();
    await handleOrcamentos(req, res);
    expect(res._s()).toBe(404);
  });

  it('deve criar orçamento (POST)', async () => {
    vi.mocked(sql)
      .mockResolvedValueOnce([{ nome: 'Cliente A' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: '1', numero: 'PRO-2026-REV00' }]);
    const req = { method: 'POST', query: {}, body: { cliente_id: '1', itens: [{ descricao: 'Item', valor_unitario: 100 }] } };
    const res = mockRes();
    await handleOrcamentos(req, res);
    expect(res._s()).toBe(201);
  });

  it('deve retornar 401 sem autorização', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: false, user: null, error: 'No auth' });
    const req = { method: 'GET', query: {} };
    const res = mockRes();
    await handleOrcamentos(req, res);
    expect(res._s()).toBe(401);
  });
});

describe('handleCondicoesPagamento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null });
  });

  it('deve listar condições (GET)', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: '1', nome: 'À vista', n_parcelas: 1 }]);
    const req = { method: 'GET', query: {} };
    const res = mockRes();
    await handleCondicoesPagamento(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve criar condição (POST)', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: '1', nome: 'Parcelado 3x' }]);
    const req = { method: 'POST', query: {}, body: { nome: 'Parcelado 3x', n_parcelas: 3 } };
    const res = mockRes();
    await handleCondicoesPagamento(req, res);
    expect(res._s()).toBe(201);
  });
});
