import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleCompras } from '../compras.js';

vi.mock('../_db.js', () => ({
  sql: vi.fn(),
  validateAuth: vi.fn(),
  extractAndVerifyToken: vi.fn(),
}));

const { sql, validateAuth, extractAndVerifyToken } = await import('../_db.js');

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

describe('handleCompras', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null });
    vi.mocked(extractAndVerifyToken).mockReturnValue({ user: { id: 'u1', name: 'Test' }, error: null });
  });

  it('deve listar pedidos (GET type=pedidos)', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: '1', numero: 'PC-2026-001', fornecedor_nome: 'Fornecedor A' }]);
    const req = { method: 'GET', query: { type: 'pedidos' }, body: {} };
    const res = mockRes();
    await handleCompras(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().data).toHaveLength(1);
  });

  it('deve buscar pedido por id (GET type=pedidos&id=X)', async () => {
    vi.mocked(sql)
      .mockResolvedValueOnce([{ id: '1', numero: 'PC-2026-001' }])
      .mockResolvedValueOnce([{ id: '1', descricao: 'Item A' }]);
    const req = { method: 'GET', query: { type: 'pedidos', id: '1' }, body: {} };
    const res = mockRes();
    await handleCompras(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().data.itens).toBeDefined();
  });

  it('deve criar pedido (POST type=pedidos)', async () => {
    vi.mocked(sql)
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([{ id: '1', numero: 'PC-2026-001' }]);
    const req = { method: 'POST', query: { type: 'pedidos' }, body: { fornecedor_id: 'f1', itens: [{ sku: 'PAR-01', quantidade_pedida: 10, preco_unitario: 5 }] } };
    const res = mockRes();
    await handleCompras(req, res);
    expect(res._s()).toBe(201);
  });

  it('deve sugerir compras (GET type=sugestao)', async () => {
    vi.mocked(sql).mockResolvedValue([{ material_id: '1', sku: 'PAR-01', descricao: 'Parafuso', estoque_atual: 0 }]);
    const req = { method: 'GET', query: { type: 'sugestao' }, body: {} };
    const res = mockRes();
    await handleCompras(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve retornar 401 sem autorização', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: false, user: null, error: 'No auth' });
    const req = { method: 'GET', query: { type: 'pedidos' }, body: {} };
    const res = mockRes();
    await handleCompras(req, res);
    expect(res._s()).toBe(401);
  });
});
