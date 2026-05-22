import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleClients, handleKanban, handleGoals } from '../crm.js';

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

describe('handleClients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null });
  });

  it('deve listar clientes (GET)', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: '1', nome: 'Cliente A' }]);
    const req = { method: 'GET', query: {} };
    const res = mockRes();
    await handleClients(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().data).toHaveLength(1);
  });

  it('deve criar cliente (POST)', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: '1', nome: 'Novo' }]);
    const req = { method: 'POST', query: {}, body: { nome: 'Novo' } };
    const res = mockRes();
    await handleClients(req, res);
    expect(res._s()).toBe(201);
  });

  it('deve retornar 401 sem autorização', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: false, user: null, error: 'No auth' });
    const req = { method: 'GET', query: {} };
    const res = mockRes();
    await handleClients(req, res);
    expect(res._s()).toBe(401);
  });

  it('deleção retorna 404 se cliente não encontrado', async () => {
    vi.mocked(sql).mockResolvedValue([]);
    const req = { method: 'DELETE', query: { id: '999' } };
    const res = mockRes();
    await handleClients(req, res);
    expect(res._s()).toBe(404);
  });
});

describe('handleKanban', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null });
  });

  it('deve listar kanban (GET)', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: '1', title: 'Lead A', status: 'novo' }]);
    const req = { method: 'GET', query: {} };
    const res = mockRes();
    await handleKanban(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve criar item kanban (POST)', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: '1', title: 'Novo Lead' }]);
    const req = { method: 'POST', query: {}, body: { title: 'Novo Lead', type: 'lead' } };
    const res = mockRes();
    await handleKanban(req, res);
    expect(res._s()).toBe(201);
  });
});

describe('handleGoals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null });
  });

  it('deve listar metas (GET)', async () => {
    vi.mocked(sql).mockResolvedValue([{ period: '2026-01', amount: '50000' }]);
    const req = { method: 'GET', query: {} };
    const res = mockRes();
    await handleGoals(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().data['2026-01']).toBe(50000);
  });

  it('deve upsert meta (POST)', async () => {
    vi.mocked(sql).mockResolvedValue([{ period: '2026-01', amount: '60000' }]);
    const req = { method: 'POST', query: {}, body: { period: '2026-01', amount: 60000 } };
    const res = mockRes();
    await handleGoals(req, res);
    expect(res._s()).toBe(200);
  });
});
