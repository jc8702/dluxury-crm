import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleAuth, handleUsers } from '../auth.js';
import bcrypt from 'bcryptjs';


vi.mock('../_db.js', () => ({
  sql: vi.fn(),
  extractAndVerifyToken: vi.fn(),
  validateAuth: vi.fn(),
  auditLog: vi.fn(),
}));

const { sql, extractAndVerifyToken } = await import('../_db.js');

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

describe('handleAuth', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deve fazer login com credenciais válidas', async () => {
    const hash = await bcrypt.hash('123456', 10);
    vi.mocked(sql).mockResolvedValue([{ id: '1', name: 'Admin', email: 'admin@test.com', role: 'admin', password_hash: hash }]);
    const req = { method: 'POST', query: { action: 'login' }, body: { email: 'admin@test.com', password: '123456' } };
    const res = mockRes();
    await handleAuth(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    expect(res._d().data.token).toBeDefined();
    expect(res._d().data.user.email).toBe('admin@test.com');
  });

  it('deve retornar 400 se email/password ausentes', async () => {
    const req = { method: 'POST', query: { action: 'login' }, body: {} };
    const res = mockRes();
    await handleAuth(req, res);
    expect(res._s()).toBe(400);
  });

  it('deve retornar 401 se usuário não encontrado', async () => {
    vi.mocked(sql).mockResolvedValue([]);
    const req = { method: 'POST', query: { action: 'login' }, body: { email: 'x@y.com', password: '123' } };
    const res = mockRes();
    await handleAuth(req, res);
    expect(res._s()).toBe(401);
  });

  it('deve retornar 401 se senha incorreta', async () => {
    const hash = await bcrypt.hash('correct', 10);
    vi.mocked(sql).mockResolvedValue([{ password_hash: hash }]);
    const req = { method: 'POST', query: { action: 'login' }, body: { email: 'a@b.com', password: 'wrong' } };
    const res = mockRes();
    await handleAuth(req, res);
    expect(res._s()).toBe(401);
  });

  it('deve retornar 403 ao registrar sem role admin', async () => {
    vi.mocked(extractAndVerifyToken).mockReturnValue({ user: { role: 'user' }, error: null });
    const req = { method: 'POST', query: { action: 'register' }, body: { name: 'X', email: 'x@x.com', password: '123', role: 'user' } };
    const res = mockRes();
    await handleAuth(req, res);
    expect(res._s()).toBe(403);
  });

  it('deve retornar 405 para método não suportado', async () => {
    const req = { method: 'PUT', query: {}, body: {} };
    const res = mockRes();
    await handleAuth(req, res);
    expect(res._s()).toBe(405);
  });
});

describe('handleUsers', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deve listar usuários', async () => {
    vi.mocked(extractAndVerifyToken).mockReturnValue({ user: { role: 'admin' }, error: null });
    vi.mocked(sql).mockResolvedValue([{ id: '1', name: 'Admin', email: 'a@a.com', role: 'admin' }]);
    const req = { method: 'GET', query: {} };
    const res = mockRes();
    await handleUsers(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
  });

  it('deve retornar 403 se não for admin', async () => {
    vi.mocked(extractAndVerifyToken).mockReturnValue({ user: { role: 'user' }, error: null });
    const req = { method: 'GET', query: {} };
    const res = mockRes();
    await handleUsers(req, res);
    expect(res._s()).toBe(403);
  });
});
