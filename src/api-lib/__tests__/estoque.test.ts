import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleEstoque } from '../estoque.js';

vi.mock('../_db.js', () => ({
  sql: vi.fn(),
  validateAuth: vi.fn(),
  extractAndVerifyToken: vi.fn(),
}));

vi.mock('../middleware/tenantMiddleware.js', () => ({
  withTenant: (handler: any) => handler,
}));

const { sql, validateAuth, extractAndVerifyToken } = await import('../_db.js');

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

describe('handleEstoque', () => {
  beforeEach(() => {
    vi.mocked(sql).mockReset();
    vi.mocked(validateAuth).mockReset();
    vi.mocked(extractAndVerifyToken).mockReset();

    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1', name: 'Test User', role: 'admin', tenantId: '00000000-0000-0000-0000-000000000000' }, error: null });

    vi.mocked(extractAndVerifyToken).mockReturnValue({ user: { id: 'u1', name: 'Test User', role: 'admin', tenantId: '00000000-0000-0000-0000-000000000000' }, error: null });
  });

  it.skip('deve retornar 401 sem autorização', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: false, user: null, error: 'Token expirado' });
    const req = mockReq({ method: 'GET', query: {} });
    const res = mockRes();
    await handleEstoque(req, res);
    expect(res._s()).toBe(401);
    expect(res._d().success).toBe(false);
  });

  describe('type === movimentacoes', () => {
    it('GET sem material_id deve retornar todas as movimentações', async () => {
      vi.mocked(sql).mockResolvedValue([{ id: 'mov-1', material_nome: 'Madeira' }]);
      const req = mockReq({ method: 'GET', query: { type: 'movimentacoes', limit: '10' } });
      const res = mockRes();
      
      await handleEstoque(req, res);
      
      expect(res._s()).toBe(200);
      expect(res._d().success).toBe(true);
      expect(res._d().data).toHaveLength(1);
    });

    it('GET com material_id deve filtrar por material_id', async () => {
      vi.mocked(sql).mockResolvedValue([{ id: 'mov-1', material_nome: 'Madeira' }]);
      const req = mockReq({ method: 'GET', query: { type: 'movimentacoes', material_id: 'mat-123' } });
      const res = mockRes();
      
      await handleEstoque(req, res);
      
      expect(res._s()).toBe(200);
      expect(res._d().data).toHaveLength(1);
    });

    it('POST deve registrar entrada de estoque com sucesso', async () => {
      // 1. SELECT materiais
      vi.mocked(sql).mockResolvedValueOnce([
        { estoque_atual: 10, fator_conversao: 1, preco_custo: 50.00, nome: 'Madeira MDF' }
      ]);
      // 2. INSERT movimentacao
      vi.mocked(sql).mockResolvedValueOnce([{ id: 'mov-new', quantidade: 5 }]);
      // 3. UPDATE materiais
      vi.mocked(sql).mockResolvedValueOnce([]);

      const req = mockReq({
        method: 'POST',
        query: { type: 'movimentacoes' },
        body: {
          material_id: 'mat-123',
          tipo: 'entrada',
          quantidade: 5,
          motivo: 'Compra',
          preco_unitario: 55.00
        }
      });
      const res = mockRes();

      await handleEstoque(req, res);

      expect(res._s()).toBe(201);
      expect(res._d().success).toBe(true);
      expect(res._d().data.id).toBe('mov-new');
    });

    it('POST deve registrar saida de estoque com sucesso', async () => {
      vi.mocked(sql).mockResolvedValueOnce([
        { estoque_atual: 10, fator_conversao: 1, preco_custo: 50.00, nome: 'Madeira MDF' }
      ]);
      vi.mocked(sql).mockResolvedValueOnce([{ id: 'mov-new', quantidade: 3 }]);
      vi.mocked(sql).mockResolvedValueOnce([]);

      const req = mockReq({
        method: 'POST',
        query: { type: 'movimentacoes' },
        body: {
          material_id: 'mat-123',
          tipo: 'saida',
          quantidade: 3,
          motivo: 'Uso em projeto'
        }
      });
      const res = mockRes();

      await handleEstoque(req, res);

      expect(res._s()).toBe(201);
      expect(res._d().success).toBe(true);
    });

    it('POST deve registrar ajuste de estoque com sucesso', async () => {
      vi.mocked(sql).mockResolvedValueOnce([
        { estoque_atual: 10, fator_conversao: 1, preco_custo: 50.00, nome: 'Madeira MDF' }
      ]);
      vi.mocked(sql).mockResolvedValueOnce([{ id: 'mov-new', quantidade: 20 }]);
      vi.mocked(sql).mockResolvedValueOnce([]);

      const req = mockReq({
        method: 'POST',
        query: { type: 'movimentacoes' },
        body: {
          material_id: 'mat-123',
          tipo: 'ajuste',
          quantidade: 20,
          motivo: 'Inventário anual'
        }
      });
      const res = mockRes();

      await handleEstoque(req, res);

      expect(res._s()).toBe(201);
    });

    it('POST deve lançar erro se material não for encontrado', async () => {
      vi.mocked(sql).mockResolvedValueOnce([]); // Material não existe

      const req = mockReq({
        method: 'POST',
        query: { type: 'movimentacoes' },
        body: { material_id: 'mat-invalido', tipo: 'entrada', quantidade: 5 }
      });
      const res = mockRes();

      await handleEstoque(req, res);

      expect(res._s()).toBe(500);
      expect(res._d().success).toBe(false);
      expect(res._d().error).toBe('Material não encontrado');
    });

    it('POST deve lançar erro se estoque for insuficiente na saida', async () => {
      vi.mocked(sql).mockResolvedValueOnce([
        { estoque_atual: 2, fator_conversao: 1, preco_custo: 50.00, nome: 'MDF' }
      ]);

      const req = mockReq({
        method: 'POST',
        query: { type: 'movimentacoes' },
        body: { material_id: 'mat-123', tipo: 'saida', quantidade: 5 }
      });
      const res = mockRes();

      await handleEstoque(req, res);

      expect(res._s()).toBe(500);
      expect(res._d().error).toBe('Estoque insuficiente');
    });
  });

  describe('type === fornecedores', () => {
    it('GET sem id deve listar todos os ativos', async () => {
      vi.mocked(sql).mockResolvedValue([{ id: 'forn-1', nome: 'Fornecedor A' }]);
      const req = mockReq({ method: 'GET', query: { type: 'fornecedores' } });
      const res = mockRes();

      await handleEstoque(req, res);

      expect(res._s()).toBe(200);
      expect(res._d().data).toHaveLength(1);
    });

    it('GET com id deve retornar fornecedor especifico', async () => {
      vi.mocked(sql).mockResolvedValue([{ id: 'forn-1', nome: 'Fornecedor A' }]);
      const req = mockReq({ method: 'GET', query: { type: 'fornecedores', id: 'forn-1' } });
      const res = mockRes();

      await handleEstoque(req, res);

      expect(res._s()).toBe(200);
      expect(res._d().data.nome).toBe('Fornecedor A');
    });

    it('POST deve cadastrar novo fornecedor', async () => {
      vi.mocked(sql).mockResolvedValueOnce([{ id: 'forn-new', nome: 'Novo Fornecedor' }]);
      const req = mockReq({
        method: 'POST',
        query: { type: 'fornecedores' },
        body: { nome: 'Novo Fornecedor', cnpj: '123', email: 'f@f.com' }
      });
      const res = mockRes();

      await handleEstoque(req, res);

      expect(res._s()).toBe(201);
      expect(res._d().data.id).toBe('forn-new');
    });

    it('PATCH deve atualizar fornecedor', async () => {
      vi.mocked(sql).mockResolvedValueOnce([{ id: 'forn-1', nome: 'Forn Atualizado' }]);
      const req = mockReq({
        method: 'PATCH',
        query: { type: 'fornecedores', id: 'forn-1' },
        body: { nome: 'Forn Atualizado', cnpj: '123' }
      });
      const res = mockRes();

      await handleEstoque(req, res);

      expect(res._s()).toBe(200);
      expect(res._d().data.nome).toBe('Forn Atualizado');
    });

    it('DELETE deve inativar fornecedor', async () => {
      vi.mocked(sql).mockResolvedValueOnce([]);
      const req = mockReq({ method: 'DELETE', query: { type: 'fornecedores', id: 'forn-1' } });
      const res = mockRes();

      await handleEstoque(req, res);

      expect(res._s()).toBe(200);
      expect(res._d().success).toBe(true);
    });

    it.skip('DELETE deve retornar 401 se user não estiver presente', async () => {
      // Auth handled by withTenant HOF (see tenantMiddleware.test.ts).
    });
  });

  describe('type === categories', () => {
    it('GET deve listar todas categorias', async () => {
      vi.mocked(sql).mockResolvedValue([{ id: 'cat-1', nome: 'Chapas' }]);
      const req = mockReq({ method: 'GET', query: { type: 'categories' } });
      const res = mockRes();

      await handleEstoque(req, res);

      expect(res._s()).toBe(200);
      expect(res._d().data).toHaveLength(1);
    });

    it('POST deve cadastrar nova categoria', async () => {
      vi.mocked(sql).mockResolvedValueOnce([{ id: 'slug-new', nome: 'Nova Cat' }]);
      const req = mockReq({
        method: 'POST',
        query: { type: 'categories' },
        body: { nome: 'Nova Cat', slug: 'NVC' }
      });
      const res = mockRes();

      await handleEstoque(req, res);

      expect(res._s()).toBe(201);
      expect(res._d().data.id).toBe('slug-new');
    });
  });

  describe('GET Geral (Materiais)', () => {
    it('GET com id deve retornar material e suas movimentações', async () => {
      vi.mocked(sql)
        .mockResolvedValueOnce([{ id: 'mat-1', nome: 'Parafuso 4x16', categoria_nome: 'Ferragens' }])
        .mockResolvedValueOnce([{ id: 'mov-1', tipo: 'entrada', quantidade: 100 }]);

      const req = mockReq({ method: 'GET', query: { id: 'mat-1' } });
      const res = mockRes();

      await handleEstoque(req, res);

      expect(res._s()).toBe(200);
      expect(res._d().data.nome).toBe('Parafuso 4x16');
      expect(res._d().data.movements).toHaveLength(1);
    });

    it('GET com query q deve buscar materiais e modelos da bom', async () => {
      // 1. Busca materiais
      vi.mocked(sql).mockResolvedValueOnce([{ id: 'mat-1', sku: 'PAR-1', nome: 'Parafuso' }]);
      // 2. Busca modelos BOM
      vi.mocked(sql).mockResolvedValueOnce([{ id: 'bom-1', sku: 'MOD-1', nome: 'Gabinete' }]);

      const req = mockReq({ method: 'GET', query: { q: 'par' } });
      const res = mockRes();

      await handleEstoque(req, res);

      expect(res._s()).toBe(200);
      expect(res._d().data).toHaveLength(2);
      expect(res._d().data[0].sku).toBe('PAR-1');
      expect(res._d().data[1].sku).toBe('MOD-1');
    });

    it('GET sem parâmetros deve listar todos os materiais ativos', async () => {
      vi.mocked(sql).mockResolvedValue([{ id: 'mat-1', nome: 'Material 1' }]);
      const req = mockReq({ method: 'GET', query: {} });
      const res = mockRes();

      await handleEstoque(req, res);

      expect(res._s()).toBe(200);
      expect(res._d().data).toHaveLength(1);
    });
  });

  describe('POST / PATCH / DELETE Geral (Materiais)', () => {
    it('POST deve criar material', async () => {
      vi.mocked(sql).mockResolvedValueOnce([{ id: 'mat-new', sku: 'SKU-NEW' }]);
      const req = mockReq({
        method: 'POST',
        query: {},
        body: { sku: 'SKU-NEW', nome: 'Chapa MDF 18mm' }
      });
      const res = mockRes();

      await handleEstoque(req, res);

      expect(res._s()).toBe(201);
      expect(res._d().data.id).toBe('mat-new');
    });

    it('PATCH deve atualizar material', async () => {
      vi.mocked(sql).mockResolvedValueOnce([{ id: 'mat-1', sku: 'SKU-UPD' }]);
      const req = mockReq({
        method: 'PATCH',
        query: { id: 'mat-1' },
        body: { sku: 'SKU-UPD', nome: 'Chapa MDF 15mm' }
      });
      const res = mockRes();

      await handleEstoque(req, res);

      expect(res._s()).toBe(200);
      expect(res._d().data.sku).toBe('SKU-UPD');
    });

    it('DELETE deve inativar material caso usuário seja admin', async () => {
      vi.mocked(sql).mockResolvedValueOnce([]);
      const req = mockReq({ method: 'DELETE', query: { id: 'mat-1' } });
      const res = mockRes();

      await handleEstoque(req, res);

      expect(res._s()).toBe(200);
      expect(res._d().success).toBe(true);
    });

    it.skip('DELETE deve retornar 403 caso usuário não seja admin', async () => {
      // Role-based 403 is now responsibility of withTenant/requireRoles HOF (see tenantMiddleware.test.ts).
    });
  });

  it('deve retornar 405 para métodos não suportados', async () => {
    const req = mockReq({ method: 'PUT', query: {} });
    const res = mockRes();

    await handleEstoque(req, res);

    expect(res._s()).toBe(405);
  });
});
