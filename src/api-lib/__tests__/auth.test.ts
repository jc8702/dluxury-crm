import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleAuth, handleUsers } from '../auth.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

vi.mock('../_db.js', () => ({
  sql: Object.assign(vi.fn(), { begin: undefined, query: vi.fn() }),
  extractAndVerifyToken: vi.fn(),
  validateAuth: vi.fn(),
  resolveTenantByDomain: vi.fn(),
  auditLog: vi.fn(),
}));

const { sql, resolveTenantByDomain } = await import('../_db.js');
const { TENANT_MASTER_ID } = await import('../../types/tenant.js');

const JWT_SECRET = process.env.APP_JWT_SECRET || 'test-secret-key-for-jwt';

function makeBearer(payload: any) {
  return 'Bearer ' + jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' });
}

function mockRes() {
  let sc = 200,
    jd: any = null;
  const headers: Record<string, string> = {};
  const self: any = {
    status: vi.fn((c: number) => {
      sc = c;
      return self;
    }),
    json: vi.fn((d: any) => {
      jd = d;
      return self;
    }),
    setHeader: vi.fn((name: string, value: string) => {
      headers[name] = value;
      return self;
    }),
    end: vi.fn(() => self),
    _s: () => sc,
    _d: () => jd,
  };
  return self;
}

describe('handleAuth', () => {
  beforeEach(() => {
    vi.mocked(sql).mockReset();
    vi.mocked(resolveTenantByDomain).mockReset();
  });

  it('deve fazer login com credenciais válidas', async () => {
    const hash = await bcrypt.hash('123456', 10);
    vi.mocked(sql).mockResolvedValue([
      {
        id: '1',
        name: 'Admin',
        email: 'admin@test.com',
        role: 'admin',
        password_hash: hash,
        tenant_id: TENANT_MASTER_ID,
        plano_tier: 'pro',
      },
    ]);
    const req = {
      method: 'POST',
      query: { action: 'login' },
      body: { email: 'admin@test.com', password: '123456' },
    };
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
    const req = { method: 'POST', query: { action: 'login' }, body: { email: 123, password: 456 } };
    const res = mockRes();
    await handleAuth(req, res);
    expect(res._s()).toBe(400);
  });

  it('deve retornar 400 se email muito longo', async () => {
    const longEmail = 'a'.repeat(260) + '@x.com';
    const req = {
      method: 'POST',
      query: { action: 'login' },
      body: { email: longEmail, password: '123' },
    };
    const res = mockRes();
    await handleAuth(req, res);
    expect(res._s()).toBe(400);
  });

  it('deve retornar 401 se usuario nao encontrado com dominio', async () => {
    vi.mocked(sql).mockResolvedValue([]);
    const req = {
      method: 'POST',
      query: { action: 'login' },
      body: { email: 'user@tenant.com', password: '123' },
      tenantFromDomain: { id: TENANT_MASTER_ID, nome: 'Tenant 1' },
    };
    const res = mockRes();
    await handleAuth(req, res);
    expect(res._s()).toBe(401);
  });

  it('deve retornar 401 se senha incorreta com dominio', async () => {
    const hash = await bcrypt.hash('correct', 10);
    vi.mocked(sql).mockResolvedValue([
      {
        id: '1',
        password_hash: hash,
        tenant_id: TENANT_MASTER_ID,
        plano_tier: 'pro',
        role: 'admin',
        name: 'X',
        email: 'x@x.com',
      },
    ]);
    const req = {
      method: 'POST',
      query: { action: 'login' },
      body: { email: 'user@tenant.com', password: 'wrong' },
      tenantFromDomain: { id: TENANT_MASTER_ID, nome: 'Tenant 1' },
    };
    const res = mockRes();
    await handleAuth(req, res);
    expect(res._s()).toBe(401);
    expect(res._d().error).toBe('Senha incorreta');
  });

  it('deve retornar 401 se usuário não encontrado no fallback', async () => {
    vi.mocked(sql).mockResolvedValue([]);
    const req = {
      method: 'POST',
      query: { action: 'login' },
      body: { email: 'x@y.com', password: '123' },
    };
    const res = mockRes();
    await handleAuth(req, res);
    expect(res._s()).toBe(401);
  });

  it('deve retornar 401 se senha incorreta no fallback', async () => {
    const hash = await bcrypt.hash('correct', 10);
    vi.mocked(sql).mockResolvedValue([
      {
        password_hash: hash,
        tenant_id: TENANT_MASTER_ID,
        plano_tier: 'pro',
        role: 'admin',
        name: 'X',
        email: 'a@b.com',
        id: '1',
      },
    ]);
    const req = {
      method: 'POST',
      query: { action: 'login' },
      body: { email: 'a@b.com', password: 'wrong' },
    };
    const res = mockRes();
    await handleAuth(req, res);
    expect(res._s()).toBe(401);
  });

  it('deve retornar 403 ao registrar sem role admin', async () => {
    const req = {
      method: 'POST',
      query: { action: 'register' },
      body: { name: 'X', email: 'x@x.com', password: '123', role: 'user' },
      headers: {
        authorization: makeBearer({
          id: 'u1',
          email: 'admin@x.com',
          role: 'user',
          tenantId: TENANT_MASTER_ID,
        }),
      },
    };
    const res = mockRes();
    await handleAuth(req, res);
    expect(res._s()).toBe(403);
  });

  it('deve registrar usuario com sucesso se admin', async () => {
    // The new withTenantSql uses sql.begin; mock the begin to return a result directly.
    vi.mocked(sql).begin = vi.fn(async (cb: any) => {
      const tx: any = (s: any, ..._v: any[]) => {
        if (Array.isArray(s) && s[0]?.includes('set_config')) return Promise.resolve([]);
        return Promise.resolve([
          {
            id: 'new-user-id',
            name: 'New User',
            email: 'new@user.com',
            role: 'user',
            tenant_id: TENANT_MASTER_ID,
          },
        ]);
      };
      return cb(tx);
    });
    const req = {
      method: 'POST',
      query: { action: 'register' },
      body: { name: 'New User', email: 'new@user.com', password: 'password123', role: 'user' },
      headers: {
        authorization: makeBearer({
          id: 'admin-id',
          email: 'admin@x.com',
          role: 'admin',
          tenantId: TENANT_MASTER_ID,
        }),
      },
    };
    const res = mockRes();
    await handleAuth(req, res);
    expect(res._s()).toBe(201);
    expect(res._d().success).toBe(true);
    expect(res._d().data.id).toBe('new-user-id');
  });

  it('deve retornar dados enrich do usuario logado (action=me)', async () => {
    vi.mocked(sql).begin = vi.fn(async (cb: any) => {
      const tx: any = (s: any, ..._v: any[]) => {
        if (Array.isArray(s) && s[0]?.includes('set_config')) return Promise.resolve([]);
        return Promise.resolve([{ plano_tier: 'enterprise', subdominio: 'empresa' }]);
      };
      return cb(tx);
    });
    const req = {
      method: 'GET',
      query: { action: 'me' },
      headers: {
        authorization: makeBearer({
          id: 'u1',
          name: 'User',
          role: 'user',
          tenantId: TENANT_MASTER_ID,
        }),
      },
    };
    const res = mockRes();
    await handleAuth(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    expect(res._d().data.user.planoTier).toBe('enterprise');
    expect(res._d().data.user.subdominio).toBe('empresa');
  });

  it('deve retornar 401 em action=me com token invalido', async () => {
    const req = {
      method: 'GET',
      query: { action: 'me' },
      headers: { authorization: 'Bearer invalid.token' },
    };
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
    const req = {
      method: 'POST',
      query: { action: 'login' },
      body: { email: 'test@test.com', password: '123' },
    };
    const res = mockRes();
    await handleAuth(req, res);
    expect(res._s()).toBe(500);
    expect(res._d().error).toBe('Falha catastrófica');
  });
});

describe('handleUsers', () => {
  beforeEach(() => {
    vi.mocked(sql).mockReset();
    vi.mocked(resolveTenantByDomain).mockReset();
  });

  it('deve listar usuários', async () => {
    vi.mocked(sql).begin = vi.fn(async (cb: any) => {
      const tx: any = (s: any, ..._v: any[]) => {
        if (Array.isArray(s) && s[0]?.includes('set_config')) return Promise.resolve([]);
        return Promise.resolve([{ id: '1', name: 'Admin', email: 'a@a.com', role: 'admin' }]);
      };
      return cb(tx);
    });
    const req = {
      method: 'GET',
      query: {},
      headers: {
        authorization: makeBearer({
          id: 'admin-id',
          role: 'admin',
          tenantId: TENANT_MASTER_ID,
          email: 'admin@x.com',
        }),
      },
    };
    const res = mockRes();
    await handleUsers(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
  });

  it('deve retornar 403 se não for admin', async () => {
    const req = {
      method: 'GET',
      query: {},
      headers: {
        authorization: makeBearer({
          id: 'u1',
          role: 'user',
          tenantId: TENANT_MASTER_ID,
          email: 'u@x.com',
        }),
      },
    };
    const res = mockRes();
    await handleUsers(req, res);
    expect(res._s()).toBe(403);
  });

  it('deve atualizar usuario logado (PATCH sem id na query)', async () => {
    vi.mocked(sql).begin = vi.fn(async (cb: any) => {
      const tx: any = (s: any, ..._v: any[]) => {
        if (Array.isArray(s) && s[0]?.includes('set_config')) return Promise.resolve([]);
        return Promise.resolve([
          { id: 'u-logado', name: 'Updated Name', email: 'updated@a.com', role: 'admin' },
        ]);
      };
      return cb(tx);
    });
    const req = {
      method: 'PATCH',
      query: {},
      body: { name: 'Updated Name', email: 'updated@a.com' },
      headers: {
        authorization: makeBearer({
          id: 'u-logado',
          role: 'admin',
          tenantId: TENANT_MASTER_ID,
          email: 'admin@x.com',
        }),
      },
    };
    const res = mockRes();
    await handleUsers(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    expect(res._d().data.name).toBe('Updated Name');
  });

  it('deve atualizar outro usuario e alterar senha (PATCH com id na query)', async () => {
    let calls = 0;
    vi.mocked(sql).begin = vi.fn(async (cb: any) => {
      const tx: any = (s: any, ..._v: any[]) => {
        if (Array.isArray(s) && s[0]?.includes('set_config')) return Promise.resolve([]);
        calls++;
        if (calls === 1) return Promise.resolve([]); // UPDATE password
        return Promise.resolve([
          { id: 'u-outro', name: 'Outro Name', email: 'outro@a.com', role: 'user' },
        ]);
      };
      return cb(tx);
    });
    const req = {
      method: 'PATCH',
      query: { id: 'u-outro' },
      body: { name: 'Outro Name', email: 'outro@a.com', password: 'novasenha123' },
      headers: {
        authorization: makeBearer({
          id: 'u-admin',
          role: 'admin',
          tenantId: TENANT_MASTER_ID,
          email: 'admin@x.com',
        }),
      },
    };
    const res = mockRes();
    await handleUsers(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
  });

  it('deve retornar 404 se usuario a ser atualizado nao for encontrado no tenant', async () => {
    vi.mocked(sql).begin = vi.fn(async (cb: any) => {
      const tx: any = (s: any, ..._v: any[]) => {
        if (Array.isArray(s) && s[0]?.includes('set_config')) return Promise.resolve([]);
        return Promise.resolve([]); // UPDATE fields retorna vazio
      };
      return cb(tx);
    });
    const req = {
      method: 'PATCH',
      query: { id: 'u-invalido' },
      body: { name: 'Nome' },
      headers: {
        authorization: makeBearer({
          id: 'u-admin',
          role: 'admin',
          tenantId: TENANT_MASTER_ID,
          email: 'admin@x.com',
        }),
      },
    };
    const res = mockRes();
    await handleUsers(req, res);
    expect(res._s()).toBe(404);
    expect(res._d().error).toBe('Usuário não encontrado no seu tenant');
  });

  it('deve deletar usuario (DELETE)', async () => {
    vi.mocked(sql).begin = vi.fn(async (cb: any) => {
      const tx: any = (s: any, ..._v: any[]) => {
        if (Array.isArray(s) && s[0]?.includes('set_config')) return Promise.resolve([]);
        return Promise.resolve([]); // DELETE statement
      };
      return cb(tx);
    });
    const req = {
      method: 'DELETE',
      query: { id: 'u-deletar' },
      headers: {
        authorization: makeBearer({
          id: 'u-admin',
          role: 'admin',
          tenantId: TENANT_MASTER_ID,
          email: 'admin@x.com',
        }),
      },
    };
    const res = mockRes();
    await handleUsers(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
  });

  it('deve retornar 405 para metodo handleUsers nao suportado', async () => {
    const req = {
      method: 'POST',
      query: {},
      headers: {
        authorization: makeBearer({
          id: 'admin',
          role: 'admin',
          tenantId: TENANT_MASTER_ID,
          email: 'admin@x.com',
        }),
      },
    };
    const res = mockRes();
    await handleUsers(req, res);
    expect(res._s()).toBe(405);
  });

  it('deve retornar 500 no handleUsers se banco falhar', async () => {
    vi.mocked(sql).begin = vi.fn(async () => {
      throw new Error('Erro no Banco');
    });
    const req = {
      method: 'GET',
      query: {},
      headers: {
        authorization: makeBearer({
          id: 'admin',
          role: 'admin',
          tenantId: TENANT_MASTER_ID,
          email: 'admin@x.com',
        }),
      },
    };
    const res = mockRes();
    await handleUsers(req, res);
    expect(res._s()).toBe(500);
    expect(res._d().error).toBe('Erro no Banco');
  });
});
