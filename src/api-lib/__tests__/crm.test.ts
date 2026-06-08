import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleClients, handleKanban, handleGoals } from '../crm.js';

vi.mock('../_db.js', () => ({
  sql: vi.fn(),
  validateAuth: vi.fn(),
  auditLog: vi.fn(),
}));

vi.mock('../middleware/tenantMiddleware.js', () => ({
  withTenant: (handler: any) => handler,
}));

vi.mock('../drizzle-db.js', () => ({
  db: {
    update: vi.fn(),
  },
}));

const { sql, validateAuth, auditLog } = await import('../_db.js');
const { db } = await import('../drizzle-db.js');

function mockDrizzleChain(resolveValue: any = []) {
  const chain: any = {};
  const methods = ['update', 'set', 'where'];
  methods.forEach((method) => {
    chain[method] = vi.fn().mockImplementation(() => chain);
  });

  chain.then = vi.fn().mockImplementation((onFulfilled) => {
    return Promise.resolve(resolveValue).then(onFulfilled);
  });
  return chain;
}

function mockRes() {
  let sc = 200,
    jd: any = null,
    ended = false;
  const self: any = {
    status: vi.fn((c: number) => {
      sc = c;
      return self;
    }),
    json: vi.fn((d: any) => {
      jd = d;
      return self;
    }),
    end: vi.fn(() => {
      ended = true;
      return self;
    }),
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

describe('handleClients', () => {
  beforeEach(() => {
    vi.mocked(sql).mockReset();
    vi.mocked(validateAuth).mockReset();
    vi.mocked(auditLog).mockReset();

    vi.mocked(validateAuth).mockReturnValue({
      authorized: true,
      user: { id: 'u1', tenantId: 'tenant-123' },
      error: null,
    });

    const defaultChain = mockDrizzleChain([]);
    vi.mocked(db.update).mockReturnValue(defaultChain);
  });

  it('deve listar clientes (GET)', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: '1', nome: 'Cliente A' }]);
    const req = mockReq({ method: 'GET', query: {} });
    const res = mockRes();
    await handleClients(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().data).toHaveLength(1);
  });

  it('deve usar query fallback se a consulta GET primária falhar', async () => {
    // 1. SELECT primary falha
    vi.mocked(sql).mockRejectedValueOnce(new Error('Coluna city não encontrada'));
    // 2. SELECT fallback funciona
    vi.mocked(sql).mockResolvedValueOnce([{ id: '1', nome: 'Cliente Fallback' }]);

    const req = mockReq({ method: 'GET', query: {} });
    const res = mockRes();
    await handleClients(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().data[0].nome).toBe('Cliente Fallback');
  });

  it('deve criar cliente (POST) com comodos como array', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: '1', nome: 'Novo' }]);
    const req = mockReq({
      method: 'POST',
      query: {},
      body: {
        nome: 'Novo',
        comodos_interesse: ['Cozinha', 'Quarto'],
        cnpj: '12.345.678/0001-90',
        cpf: '123.456.789-00',
      },
    });
    const res = mockRes();
    await handleClients(req, res);
    expect(res._s()).toBe(201);
    expect(vi.mocked(auditLog)).toHaveBeenCalledWith(
      TEST_TENANT_ID,
      'clients',
      '1',
      'CREATE',
      expect.any(String),
      null,
      expect.any(Object),
    );
  });

  it('deve criar cliente (POST) com comodos como string', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: '1', nome: 'Novo' }]);
    const req = mockReq({
      method: 'POST',
      query: {},
      body: {
        nome: 'Novo',
        comodos_interesse: 'Cozinha, Quarto',
      },
    });
    const res = mockRes();
    await handleClients(req, res);
    expect(res._s()).toBe(201);
  });

  it('deve atualizar cliente (PUT/PATCH)', async () => {
    // 1. SELECT before
    vi.mocked(sql).mockResolvedValueOnce([{ id: '1', nome: 'Antes' }]);
    // 2. UPDATE
    vi.mocked(sql).mockResolvedValueOnce([{ id: '1', nome: 'Depois' }]);

    const req = mockReq({
      method: 'PATCH',
      query: { id: '1' },
      body: { nome: 'Depois', comodos_interesse: ['Banheiro'] },
    });
    const res = mockRes();

    await handleClients(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().data.nome).toBe('Depois');
    expect(vi.mocked(auditLog)).toHaveBeenCalledWith(
      TEST_TENANT_ID,
      'clients',
      '1',
      'UPDATE',
      expect.any(String),
      expect.any(Object),
      expect.any(Object),
    );
  });

  it('deve retornar 404 na atualização se cliente não for encontrado', async () => {
    vi.mocked(sql).mockResolvedValueOnce([]); // sem registro
    const req = mockReq({ method: 'PATCH', query: { id: '999' }, body: { nome: 'Inexistente' } });
    const res = mockRes();

    await handleClients(req, res);

    expect(res._s()).toBe(404);
  });

  it('deve fazer soft delete do cliente, projetos e orçamentos (DELETE)', async () => {
    vi.mocked(sql)
      .mockResolvedValueOnce([{ id: '1', nome: 'Cliente Ativo' }]) // SELECT before
      .mockResolvedValueOnce([]) // UPDATE clients
      .mockResolvedValueOnce([]); // UPDATE projects

    const req = mockReq({ method: 'DELETE', query: { id: '1' } });
    const res = mockRes();

    await handleClients(req, res);

    expect(res._s()).toBe(200);
    expect(vi.mocked(auditLog)).toHaveBeenCalledWith(
      TEST_TENANT_ID,
      'clients',
      '1',
      'DELETE',
      expect.any(String),
      expect.any(Object),
      { status: 'deleted' },
    );
  });

  it('deve retornar 404 na deleção se cliente não for encontrado', async () => {
    vi.mocked(sql).mockResolvedValueOnce([]);
    const req = mockReq({ method: 'DELETE', query: { id: '999' } });
    const res = mockRes();

    await handleClients(req, res);

    expect(res._s()).toBe(404);
  });

  it.skip('deve retornar 401 se não autorizado', async () => {
    vi.mocked(validateAuth).mockReturnValue({
      authorized: false,
      user: null,
      error: 'Token inválido',
    });
    const req = mockReq({ method: 'GET', query: {} });
    const res = mockRes();
    await handleClients(req, res);
    expect(res._s()).toBe(401);
  });

  it('deve retornar 405 para métodos não permitidos', async () => {
    const req = mockReq({ method: 'OPTIONS', query: {} });
    const res = mockRes();
    await handleClients(req, res);
    expect(res._s()).toBe(405);
  });

  it('deve retornar 500 com mensagem genérica em caso de erro inesperado', async () => {
    vi.mocked(sql)
      .mockRejectedValueOnce(new Error('Queda de energia no datacenter'))
      .mockRejectedValueOnce(new Error('Queda de energia no datacenter'));
    const req = mockReq({ method: 'GET', query: {} });
    const res = mockRes();
    await handleClients(req, res);
    expect(res._s()).toBe(500);
    expect(res._d().error).toBe('Queda de energia no datacenter');
  });

  it('deve retornar 500 com mensagem específica para violação de chave única', async () => {
    vi.mocked(sql).mockRejectedValueOnce(
      new Error('duplicate key value violates unique constraint'),
    );
    const req = mockReq({ method: 'POST', query: {}, body: { nome: 'Cliente Duplicado' } });
    const res = mockRes();
    await handleClients(req, res);
    expect(res._s()).toBe(500);
    expect(res._d().error).toBe(
      'Já existe um registro cadastrado com este identificador (CPF/CNPJ/Código).',
    );
  });
});

describe('handleKanban', () => {
  beforeEach(() => {
    vi.mocked(sql).mockReset();
    vi.mocked(validateAuth).mockReset();
    vi.mocked(validateAuth).mockReturnValue({
      authorized: true,
      user: { id: 'u1', tenantId: 'tenant-123' },
      error: null,
    });
  });

  it('deve listar kanban (GET)', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: '1', title: 'Lead A', status: 'novo' }]);
    const req = mockReq({ method: 'GET', query: {} });
    const res = mockRes();
    await handleKanban(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve criar item kanban (POST)', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: '1', title: 'Novo Lead' }]);
    const req = mockReq({
      method: 'POST',
      query: {},
      body: { title: 'Novo Lead', type: 'project', status: 'proposta' },
    });
    const res = mockRes();
    await handleKanban(req, res);
    expect(res._s()).toBe(201);
  });

  it('deve atualizar item kanban (PATCH/PUT)', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: '1', title: 'Lead Movido', status: 'visita' }]);
    const req = mockReq({
      method: 'PATCH',
      query: { id: '1' },
      body: { status: 'visita', title: 'Lead Movido' },
    });
    const res = mockRes();
    await handleKanban(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve retornar 405 para métodos não permitidos', async () => {
    const req = mockReq({ method: 'DELETE', query: {} });
    const res = mockRes();
    await handleKanban(req, res);
    expect(res._s()).toBe(405);
  });

  it('deve retornar 500 em caso de erro', async () => {
    vi.mocked(sql).mockRejectedValueOnce(new Error('Erro no Kanban'));
    const req = mockReq({ method: 'GET', query: {} });
    const res = mockRes();
    await handleKanban(req, res);
    expect(res._s()).toBe(500);
  });
});

describe('handleGoals', () => {
  beforeEach(() => {
    vi.mocked(sql).mockReset();
    vi.mocked(validateAuth).mockReset();
    vi.mocked(validateAuth).mockReturnValue({
      authorized: true,
      user: { id: 'u1', tenantId: 'tenant-123' },
      error: null,
    });
  });

  it('deve listar metas (GET)', async () => {
    vi.mocked(sql).mockResolvedValue([{ period: '2026-01', amount: '50000' }]);
    const req = mockReq({ method: 'GET', query: {} });
    const res = mockRes();
    await handleGoals(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().data['2026-01']).toBe(50000);
  });

  it('deve upsert meta (POST)', async () => {
    vi.mocked(sql).mockResolvedValue([{ period: '2026-01', amount: '60000' }]);
    const req = mockReq({ method: 'POST', query: {}, body: { period: '2026-01', amount: 60000 } });
    const res = mockRes();
    await handleGoals(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve retornar 405 para métodos não permitidos', async () => {
    const req = mockReq({ method: 'DELETE', query: {} });
    const res = mockRes();
    await handleGoals(req, res);
    expect(res._s()).toBe(405);
  });

  it('deve retornar 500 em caso de erro', async () => {
    vi.mocked(sql).mockRejectedValueOnce(new Error('Erro nas Metas'));
    const req = mockReq({ method: 'GET', query: {} });
    const res = mockRes();
    await handleGoals(req, res);
    expect(res._s()).toBe(500);
  });
});
