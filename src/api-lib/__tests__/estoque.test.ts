import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleEstoque } from '../estoque.js';

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

describe('handleEstoque', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null });
    vi.mocked(extractAndVerifyToken).mockReturnValue({ user: { id: 'u1', name: 'Test' }, error: null });
  });

  it('deve listar materiais (GET sem id)', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: '1', sku: 'PAR-01', nome: 'Parafuso', categoria_nome: 'Ferragens' }]);
    const req = { method: 'GET', query: {} };
    const res = mockRes();
    await handleEstoque(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().data).toHaveLength(1);
  });

  it('deve buscar material por id (GET com id)', async () => {
    vi.mocked(sql)
      .mockResolvedValueOnce([{ id: '1', sku: 'PAR-01', nome: 'Parafuso' }])
      .mockResolvedValueOnce([{ id: '1', tipo: 'entrada', quantidade: 10 }]);
    const req = { method: 'GET', query: { id: '1' } };
    const res = mockRes();
    await handleEstoque(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().data.movements).toBeDefined();
  });

  it('deve criar material (POST)', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: '1', sku: 'PAR-01' }]);
    const req = { method: 'POST', query: {}, body: { sku: 'PAR-01', nome: 'Parafuso' } };
    const res = mockRes();
    await handleEstoque(req, res);
    expect(res._s()).toBe(201);
  });

  it('deve listar fornecedores (GET type=fornecedores)', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: '1', nome: 'Fornecedor A' }]);
    const req = { method: 'GET', query: { type: 'fornecedores' } };
    const res = mockRes();
    await handleEstoque(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve listar categorias (GET type=categories)', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: '1', nome: 'Ferragens' }]);
    const req = { method: 'GET', query: { type: 'categories' } };
    const res = mockRes();
    await handleEstoque(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve registrar movimentação (POST type=movimentacoes)', async () => {
    vi.mocked(sql)
      .mockResolvedValueOnce([{ estoque_atual: 10, fator_conversao: 1, preco_custo: 5, nome: 'Parafuso' }])
      .mockResolvedValueOnce([{ id: '1' }]);
    const req = { method: 'POST', query: { type: 'movimentacoes' }, body: { material_id: '1', tipo: 'entrada', quantidade: 5, motivo: 'Compra' } };
    const res = mockRes();
    await handleEstoque(req, res);
    expect(res._s()).toBe(201);
  });

  it('deve retornar 401 sem autorização', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: false, user: null, error: 'No auth' });
    const req = { method: 'GET', query: {} };
    const res = mockRes();
    await handleEstoque(req, res);
    expect(res._s()).toBe(401);
  });
});
