import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleProjects, handleReports, handleEngineering } from '../projects.js';

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

describe('handleProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null });
  });

  it('deve listar projetos (GET)', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: '1', ambiente: 'Cozinha' }]);
    const req = { method: 'GET', query: {} };
    const res = mockRes();
    await handleProjects(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().data).toHaveLength(1);
  });

  it('deve buscar projetos por cliente (GET ?client_id=X)', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: '1', ambiente: 'Cozinha' }]);
    const req = { method: 'GET', query: { client_id: 'c1' } };
    const res = mockRes();
    await handleProjects(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve criar projeto (POST)', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: '1', ambiente: 'Quarto' }]);
    const req = { method: 'POST', query: {}, body: { client_id: 'c1', ambiente: 'Quarto' } };
    const res = mockRes();
    await handleProjects(req, res);
    expect(res._s()).toBe(201);
  });

  it('deve retornar 404 no PATCH se projeto não encontrado', async () => {
    vi.mocked(sql).mockResolvedValue([]);
    const req = { method: 'PATCH', query: { id: '999' }, body: { status: 'concluido' } };
    const res = mockRes();
    await handleProjects(req, res);
    expect(res._s()).toBe(404);
  });

  it('deve retornar 401 sem autorização', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: false, user: null, error: 'No auth' });
    const req = { method: 'GET', query: {} };
    const res = mockRes();
    await handleProjects(req, res);
    expect(res._s()).toBe(401);
  });
});

describe('handleReports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null });
  });

  it('deve retornar 400 se tipo inválido', async () => {
    const req = { method: 'GET', query: { type: 'invalido' } };
    const res = mockRes();
    await handleReports(req, res);
    expect(res._s()).toBe(400);
  });
});

describe('handleEngineering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null });
  });

  it('deve listar produtos (GET)', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: '1', nome: 'Produto', codigo: 'P001' }]);
    const req = { method: 'GET', query: {} };
    const res = mockRes();
    await handleEngineering(req, res);
    expect(res._s()).toBe(200);
  });
});
