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
  beforeEach(() => { 
    vi.mocked(sql).mockReset();
    vi.mocked(extractAndVerifyToken).mockReset();
  });

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

  it('deve retornar 400 se formato de email/senha for inválido', async () => {
    const req = { method: 'POST', query: { action: 'login' }, body: { email: 123, password: '123' } };
    const res = mockRes();
    await handleAuth(req, res);
    expect(res._s()).toBe(400);
    expect(res._d().error).toBe('Formato inválido');
  });

  it('deve retornar 400 se email for muito longo', async () => {
    const longEmail = 'a'.repeat(250) + '@test.com';
    const req = { method: 'POST', query: { action: 'login' }, body: { email: longEmail, password: '123' } };
    const res = mockRes();
    await handleAuth(req, res);
    expect(res._s()).toBe(400);
    expect(res._d().error).toBe('Email muito longo');
  });

  it('deve fazer login com tenantFromDomain com sucesso', async () => {
    const hash = await bcrypt.hash('123456', 10);
    vi.mocked(sql).mockResolvedValue([{ id: '1', name: 'User', email: 'user@tenant.com', role: 'user', password_hash: hash, tenant_id: 'tenant-uuid', plano_tier: 'pro' }]);
    const req = {
      method: 'POST',
      query: { action: 'login' },
      body: { email: 'user@tenant.com', password: '123456' },
      tenantFromDomain: { id: 'tenant-uuid', nome: 'Tenant 1' },
    };
    const res = mockRes();
    await handleAuth(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    expect(res._d().data.user.planoTier).toBe('pro');
  });

  it('deve retornar 401 se usuario nao encontrado no tenantFromDomain', async () => {
    vi.mocked(sql).mockResolvedValue([]);
    const req = {
      method: 'POST',
      query: { action: 'login' },
      body: { email: 'nonexistent@tenant.com', password: '123' },
      tenantFromDomain: { id: 'tenant-uuid', nome: 'Tenant 1' },
    };
    const res = mockRes();
    await handleAuth(req, res);
    expect(res._s()).toBe(401);
    expect(res._d().error).toBe('Usuário não encontrado neste domínio');
  });

  it('deve retornar 401 se senha incorreta com tenantFromDomain', async () => {
    const hash = await bcrypt.hash('correct', 10);
    vi.mocked(sql).mockResolvedValue([{ password_hash: hash }]);
    const req = {
      method: 'POST',
      query: { action: 'login' },
      body: { email: 'user@tenant.com', password: 'wrong' },
      tenantFromDomain: { id: 'tenant-uuid', nome: 'Tenant 1' },
    };
    const res = mockRes();
    await handleAuth(req, res);
    expect(res._s()).toBe(401);
    expect(res._d().error).toBe('Senha incorreta');
  });

  it('deve retornar 401 se usuário não encontrado no fallback', async () => {
    vi.mocked(sql).mockResolvedValue([]);
    const req = { method: 'POST', query: { action: 'login' }, body: { email: 'x@y.com', password: '123' } };
    const res = mockRes();
    await handleAuth(req, res);
    expect(res._s()).toBe(401);
  });

  it('deve retornar 401 se senha incorreta no fallback', async () => {
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

  it('deve registrar usuario com sucesso se admin', async () => {
    vi.mocked(extractAndVerifyToken).mockReturnValue({ user: { role: 'admin', tenantId: 'tenant-uuid' }, error: null });
    vi.mocked(sql).mockResolvedValue([{ id: 'new-user-id', name: 'New User', email: 'new@user.com', role: 'user', tenant_id: 'tenant-uuid' }]);
    const req = { method: 'POST', query: { action: 'register' }, body: { name: 'New User', email: 'new@user.com', password: 'password123', role: 'user' } };
    const res = mockRes();
    await handleAuth(req, res);
    expect(res._s()).toBe(201);
    expect(res._d().success).toBe(true);
    expect(res._d().data.id).toBe('new-user-id');
  });

  it('deve retornar dados enrich do usuario logado (action=me)', async () => {
    vi.mocked(extractAndVerifyToken).mockReturnValue({ user: { id: 'u1', name: 'User', role: 'user', tenantId: 'tenant-uuid' }, error: null });
    vi.mocked(sql).mockResolvedValue([{ plano_tier: 'enterprise', subdominio: 'empresa' }]);
    const req = { method: 'GET', query: { action: 'me' } };
    const res = mockRes();
    await handleAuth(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    expect(res._d().data.user.planoTier).toBe('enterprise');
    expect(res._d().data.user.subdominio).toBe('empresa');
  });

  it('deve retornar 401 em action=me com token invalido', async () => {
    vi.mocked(extractAndVerifyToken).mockReturnValue({ user: null, error: 'Token expirado' });
    const req = { method: 'GET', query: { action: 'me' } };
    const res = mockRes();
    await handleAuth(req, res);
    expect(res._s()).toBe(401);
  });

  it('deve retornar 405 para método não suportado', async () => {
    const req = { method: 'PUT', query: {}, body: {} };
    const res = mockRes();
    await handleAuth(req, res);
    expect(res._s()).toBe(405);
  });

  it('deve retornar 500 se ocorrer excecao inesperada', async () => {
    vi.mocked(sql).mockRejectedValueOnce(new Error('Falha catastrófica'));
    const req = { method: 'POST', query: { action: 'login' }, body: { email: 'test@test.com', password: '123' } };
    const res = mockRes();
    await handleAuth(req, res);
    expect(res._s()).toBe(500);
    expect(res._d().error).toBe('Falha catastrófica');
  });
});

describe('handleUsers', () => {
  beforeEach(() => { 
    vi.mocked(sql).mockReset();
    vi.mocked(extractAndVerifyToken).mockReset();
  });

  it('deve listar usuários', async () => {
    vi.mocked(extractAndVerifyToken).mockReturnValue({ user: { role: 'admin', tenantId: 'tenant-1' }, error: null });
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

  it('deve atualizar usuario logado (PATCH sem id na query)', async () => {
    vi.mocked(extractAndVerifyToken).mockReturnValue({ user: { id: 'u-logado', role: 'admin', tenantId: 'tenant-1' }, error: null });
    vi.mocked(sql).mockResolvedValueOnce([{ id: 'u-logado', name: 'Updated Name', email: 'updated@a.com', role: 'admin' }]);

    const req = {
      method: 'PATCH',
      query: {},
      body: { name: 'Updated Name', email: 'updated@a.com' },
    };
    const res = mockRes();
    await handleUsers(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    expect(res._d().data.name).toBe('Updated Name');
  });

  it('deve atualizar outro usuario e alterar senha (PATCH com id na query)', async () => {
    vi.mocked(extractAndVerifyToken).mockReturnValue({ user: { id: 'u-admin', role: 'admin', tenantId: 'tenant-1' }, error: null });
    vi.mocked(sql)
      .mockResolvedValueOnce([]) // UPDATE password
      .mockResolvedValueOnce([{ id: 'u-outro', name: 'Outro Name', email: 'outro@a.com', role: 'user' }]); // UPDATE fields

    const req = {
      method: 'PATCH',
      query: { id: 'u-outro' },
      body: { name: 'Outro Name', email: 'outro@a.com', password: 'novasenha123' },
    };
    const res = mockRes();
    await handleUsers(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
  });

  it('deve retornar 404 se usuario a ser atualizado nao for encontrado no tenant', async () => {
    vi.mocked(extractAndVerifyToken).mockReturnValue({ user: { id: 'u-admin', role: 'admin', tenantId: 'tenant-1' }, error: null });
    vi.mocked(sql).mockResolvedValueOnce([]); // UPDATE fields retorna vazio

    const req = {
      method: 'PATCH',
      query: { id: 'u-invalido' },
      body: { name: 'Nome' },
    };
    const res = mockRes();
    await handleUsers(req, res);
    expect(res._s()).toBe(404);
    expect(res._d().error).toBe('Usuário não encontrado no seu tenant');
  });

  it('deve deletar usuario (DELETE)', async () => {
    vi.mocked(extractAndVerifyToken).mockReturnValue({ user: { id: 'u-admin', role: 'admin', tenantId: 'tenant-1' }, error: null });
    vi.mocked(sql).mockResolvedValueOnce([]); // DELETE statement

    const req = {
      method: 'DELETE',
      query: { id: 'u-deletar' },
    };
    const res = mockRes();
    await handleUsers(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
  });

  it('deve retornar 405 para metodo handleUsers nao suportado', async () => {
    vi.mocked(extractAndVerifyToken).mockReturnValue({ user: { role: 'admin' }, error: null });
    const req = { method: 'POST', query: {} };
    const res = mockRes();
    await handleUsers(req, res);
    expect(res._s()).toBe(405);
  });

  it('deve retornar 500 no handleUsers se banco falhar', async () => {
    vi.mocked(extractAndVerifyToken).mockReturnValue({ user: { role: 'admin', tenantId: 'tenant-1' }, error: null });
    vi.mocked(sql).mockRejectedValueOnce(new Error('Erro no Banco'));
    const req = { method: 'GET', query: {} };
    const res = mockRes();
    await handleUsers(req, res);
    expect(res._s()).toBe(500);
    expect(res._d().error).toBe('Erro no Banco');
  });
});
