import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleCompras } from '../compras.js';

vi.mock('../_db.js', () => {
  const sql = Object.assign(vi.fn().mockResolvedValue([]), {
    begin: vi.fn(async (cb: any) => cb(sql)),
    join: vi.fn((values: any[]) => values),
  });
  return {
    sql,
    validateAuth: vi.fn(),
    extractAndVerifyToken: vi.fn(),
  };
});

vi.mock('../middleware/tenantMiddleware.js', () => ({
  withTenant: (handler: any) => handler,
}));

const { sql, validateAuth, extractAndVerifyToken } = (await import('../_db.js')) as any;

function mockRes() {
  let sc = 200,
    jd: any = null;
  const self: any = {
    status: vi.fn((c: number) => {
      sc = c;
      return self;
    }),
    json: vi.fn((d: any) => {
      jd = d;
      return self;
    }),
    end: vi.fn(() => self),
    _s: () => sc,
    _d: () => jd,
  };
  return self;
}

const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000000';
const TEST_USER = {
  id: 'u1',
  tenantId: TEST_TENANT_ID,
  role: 'admin',
  email: 't@e.com',
  name: 'Tester',
};

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

describe('handleCompras', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    sql.begin = vi.fn(async (cb: any) => cb(sql));
    sql.join = vi.fn((values: any[]) => values);
    vi.mocked(validateAuth).mockReturnValue({
      authorized: true,
      user: { id: 'u1', name: 'Test', tenantId: '00000000-0000-0000-0000-000000000000' },
      error: null,
    });

    vi.mocked(extractAndVerifyToken).mockReturnValue({
      user: { id: 'u1', name: 'Test' },
      error: null,
    });
    vi.mocked(sql).mockResolvedValue([]); // Redefine padrão para evitar poluição
  });

  // 1. Pedidos (GET)
  it('deve listar pedidos (GET type=pedidos)', async () => {
    vi.mocked(sql).mockResolvedValue([
      { id: '1', numero: 'PC-2026-001', fornecedor_nome: 'Fornecedor A' },
    ]);
    const req = mockReq({ method: 'GET', query: { type: 'pedidos' }, body: {} });
    const res = mockRes();
    await handleCompras(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().data).toHaveLength(1);
  });

  it('deve buscar pedido por id (GET type=pedidos&id=X)', async () => {
    vi.mocked(sql)
      .mockResolvedValueOnce([{ id: '1', numero: 'PC-2026-001' }])
      .mockResolvedValueOnce([{ id: '1', descricao: 'Item A' }]);
    const req = mockReq({ method: 'GET', query: { type: 'pedidos', id: '1' }, body: {} });
    const res = mockRes();
    await handleCompras(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().data.itens).toBeDefined();
  });

  it('deve buscar pedidos por fornecedor (GET type=pedidos&fornecedor_id=X)', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: '1', numero: 'PC-2026-001', fornecedor_id: 'f1' }]);
    const req = mockReq({
      method: 'GET',
      query: { type: 'pedidos', fornecedor_id: 'f1' },
      body: {},
    });
    const res = mockRes();
    await handleCompras(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().data).toHaveLength(1);
  });

  // 2. Pedidos (DELETE)
  it('deve deletar pedido e itens (DELETE type=pedidos&id=X)', async () => {
    const req = mockReq({ method: 'DELETE', query: { type: 'pedidos', id: '1' }, body: {} });
    const res = mockRes();
    await handleCompras(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
  });

  it('deve retornar 400 ao deletar sem id (DELETE type=pedidos)', async () => {
    const req = mockReq({ method: 'DELETE', query: { type: 'pedidos' }, body: {} });
    const res = mockRes();
    await handleCompras(req, res);
    expect(res._s()).toBe(400);
  });

  // 3. Pedidos (POST)
  it('deve criar pedido (POST type=pedidos)', async () => {
    vi.mocked(sql)
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([{ id: '1', numero: 'PC-2026-001' }]);
    const req = mockReq({
      method: 'POST',
      query: { type: 'pedidos' },
      body: {
        fornecedor_id: 'f1',
        frete: 50,
        itens: [{ sku: 'PAR-01', quantidade_pedida: 10, preco_unitario: 5 }],
      },
    });
    const res = mockRes();
    await handleCompras(req, res);
    expect(res._s()).toBe(201);
  });

  // 4. Pedidos (PATCH/PUT)
  it('deve atualizar pedido e gerar titulos a pagar ao confirmar (PATCH type=pedidos&id=X)', async () => {
    vi.mocked(sql)
      .mockResolvedValueOnce([
        { id: '1', numero: 'PC-2026-001', valor_total: 1500, fornecedor_id: 2 },
      ]) // UPDATE do pedido
      .mockResolvedValueOnce([]) // SELECT titulos_pagar existentes (length 0)
      .mockResolvedValueOnce([{ id: 'cond-1', nome: '3x', parcelas: 3 }]) // SELECT condicoes_pagamento
      .mockResolvedValueOnce([{ id: 'class-1' }]) // SELECT classes_financeiras
      .mockResolvedValueOnce([{ id: 'forma-1' }]) // SELECT formas_pagamento
      .mockResolvedValueOnce([{ id: 'conta-1' }]) // SELECT contas_internas
      .mockResolvedValue([]); // INSERT titulos_pagar

    const req = mockReq({
      method: 'PATCH',
      query: { type: 'pedidos', id: '1' },
      body: {
        status: 'confirmado',
        condicao_pagamento_id: 'cond-1',
        frete: 50,
        itens: [
          {
            material_id: 'mat-1',
            sku: 'PAR-01',
            descricao: 'Parafuso',
            quantidade_pedida: 10,
            preco_unitario: 15,
          },
        ],
      },
    });
    const res = mockRes();
    await handleCompras(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
  });

  // 5. Itens (POST/DELETE)
  it('deve adicionar item ao pedido (POST type=itens)', async () => {
    vi.mocked(sql)
      .mockResolvedValueOnce([{ id: 'item-new', pedido_id: '1' }]) // INSERT item
      .mockResolvedValueOnce([]); // UPDATE total do pedido
    const req = mockReq({
      method: 'POST',
      query: { type: 'itens' },
      body: {
        pedido_id: '1',
        material_id: 'mat-1',
        sku: 'PAR-01',
        descricao: 'Parafuso',
        quantidade_pedida: 10,
        preco_unitario: 15,
      },
    });
    const res = mockRes();
    await handleCompras(req, res);
    expect(res._s()).toBe(201);
    expect(res._d().success).toBe(true);
  });

  it('deve remover item do pedido (DELETE type=itens&id=X)', async () => {
    vi.mocked(sql)
      .mockResolvedValueOnce([{ pedido_id: '1' }]) // SELECT pedido_id
      .mockResolvedValueOnce([]) // DELETE item
      .mockResolvedValueOnce([]); // UPDATE total do pedido
    const req = mockReq({ method: 'DELETE', query: { type: 'itens', id: 'item-1' }, body: {} });
    const res = mockRes();
    await handleCompras(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
  });

  // 6. Recebimento (POST)
  it('deve registrar recebimento de itens e atualizar estoque (POST type=recebimento)', async () => {
    vi.mocked(sql)
      .mockResolvedValueOnce([]) // INSERT recebimentos_compra
      .mockResolvedValueOnce([
        {
          id: 'item-1',
          material_id: 'mat-1',
          preco_unitario: 15,
          quantidade_pedida: 10,
          quantidade_recebida: 10,
        },
      ]) // UPDATE pedido_compra_itens
      .mockResolvedValueOnce([]) // UPDATE status_item
      .mockResolvedValueOnce([]) // INSERT movimentacoes_estoque
      .mockResolvedValueOnce([]) // UPDATE materiais (estoque)
      .mockResolvedValueOnce([{ quantidade_pedida: 10, quantidade_recebida: 10 }]) // SELECT total do pedido
      .mockResolvedValue([]); // UPDATE status do pedido

    const req = mockReq({
      method: 'POST',
      query: { type: 'recebimento' },
      body: {
        pedido_id: '123e4567-e89b-12d3-a456-426614174000',
        nota_fiscal: 'NF-100',
        observacao: 'Recebido ok',
        itens_recebidos: [{ item_id: 'item-1', quantidade: 10 }],
      },
    });
    const res = mockRes();
    await handleCompras(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
  });

  // 7. Sugestão e Histórico de Preços
  it('deve sugerir compras (GET type=sugestao)', async () => {
    vi.mocked(sql).mockResolvedValue([
      { material_id: '1', sku: 'PAR-01', descricao: 'Parafuso', estoque_atual: 0 },
    ]);
    const req = mockReq({ method: 'GET', query: { type: 'sugestao' }, body: {} });
    const res = mockRes();
    await handleCompras(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve buscar historico de precos do material (GET type=historico_precos&material_id=X)', async () => {
    vi.mocked(sql).mockResolvedValue([
      {
        data_recebimento: '2026-06-04',
        quantidade_recebida: 5,
        preco_unitario: '10.00',
        pedido_numero: 'PC-1',
        fornecedor_nome: 'Fornecedor A',
      },
    ]);
    const req = mockReq({
      method: 'GET',
      query: { type: 'historico_precos', material_id: 'mat-1' },
      body: {},
    });
    const res = mockRes();
    await handleCompras(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().data).toHaveLength(1);
  });

  // 8. Segurança e Métodos Não Suportados
  it.skip('deve retornar 401 sem autorização', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: false, user: null, error: 'No auth' });
    const req = mockReq({ method: 'GET', query: { type: 'pedidos' }, body: {} });
    const res = mockRes();
    await handleCompras(req, res);
    expect(res._s()).toBe(401);
  });

  it('deve retornar 405 para tipo desconhecido ou método não suportado', async () => {
    const req = mockReq({ method: 'PUT', query: { type: 'desconhecido' }, body: {} });
    const res = mockRes();
    await handleCompras(req, res);
    expect(res._s()).toBe(405);
  });
});
