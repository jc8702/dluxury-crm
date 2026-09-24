import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

vi.mock('../_db.js', () => ({
  sql: vi.fn(),
  extractAndVerifyToken: vi.fn(),
  validateAuth: vi.fn(),
  resolveTenantByDomain: vi.fn(),
  auditLog: vi.fn(),
}));

vi.mock('../middleware/rateLimiter.js', () => ({
  loginRateLimit: vi.fn().mockResolvedValue(true),
  applyRateLimit: vi.fn().mockResolvedValue(true),
}));

vi.mock('@sentry/node', () => ({
  captureMessage: vi.fn(),
}));

const { sql } = await import('../_db.js');
const { withTenant, resolveTenantRequest, __clearUserSessionCache } =
  await import('../middleware/tenantMiddleware.js');
const { TENANT_MASTER_ID } = await import('../../types/tenant.js');

const JWT_SECRET = process.env.APP_JWT_SECRET || 'test-secret-key-for-jwt';

function makeToken(payload: any, opts: jwt.SignOptions = {}) {
  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256', expiresIn: '8h', ...opts });
}

function mockRes() {
  let sc = 200;
  let jd: any = null;
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

function mockReq(headers: Record<string, string> = {}) {
  return {
    method: 'GET',
    url: '/api/test',
    headers,
    body: {},
    query: {},
  };
}

/**
 * Mock de sql que responde a duas consultas distintas do middleware:
 *  - tenantExists (apenas para tenant não-master)
 *  - loadUserSession (SELECT id, tenant_id, ativo, token_version FROM users)
 */
function mockDb({ tenantRow, userRow }: { tenantRow?: any; userRow?: any }) {
  vi.mocked(sql).mockImplementation(async (strings: any) => {
    const text = Array.isArray(strings) ? strings.join('?') : String(strings);
    if (text.includes('FROM users')) {
      return userRow ? [userRow] : [];
    }
    if (text.includes('FROM tenants')) {
      return tenantRow ? [tenantRow] : [];
    }
    return [];
  });
}

const USER_ROW = {
  id: 'u1',
  tenant_id: TENANT_MASTER_ID,
  ativo: true,
  token_version: 3,
};

describe('S-05: sessão de usuário no middleware (token_version + ativo)', () => {
  beforeEach(() => {
    vi.mocked(sql).mockReset();
    __clearUserSessionCache();
  });

  it('token com token_version divergente (senha trocada) recebe 401', async () => {
    const handler = vi.fn();
    const wrapped = withTenant(handler);
    mockDb({ userRow: { ...USER_ROW, token_version: 4 } });
    const token = makeToken({
      id: 'u1',
      email: 'u@x.com',
      role: 'admin',
      tenantId: TENANT_MASTER_ID,
      token_version: 3,
    });
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();
    await wrapped(req, res);
    expect(res._s()).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('token de usuário inativo recebe 401', async () => {
    const handler = vi.fn();
    const wrapped = withTenant(handler);
    mockDb({ userRow: { ...USER_ROW, ativo: false } });
    const token = makeToken({
      id: 'u1',
      email: 'u@x.com',
      role: 'admin',
      tenantId: TENANT_MASTER_ID,
      token_version: 3,
    });
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();
    await wrapped(req, res);
    expect(res._s()).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('token sem claim token_version (pré-S-05) casa com banco em 0 e continua válido', async () => {
    const handler = vi.fn(async (_req: any, res: any) => res.status(200).json({ success: true }));
    const wrapped = withTenant(handler);
    mockDb({ userRow: { ...USER_ROW, token_version: 0 } });
    const token = makeToken({
      id: 'u1',
      email: 'u@x.com',
      role: 'admin',
      tenantId: TENANT_MASTER_ID,
    });
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();
    await wrapped(req, res);
    expect(res._s()).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('token sem claim após bump de versão (senha trocada) recebe 401', async () => {
    const handler = vi.fn();
    const wrapped = withTenant(handler);
    mockDb({ userRow: { ...USER_ROW, token_version: 1 } });
    const token = makeToken({
      id: 'u1',
      email: 'u@x.com',
      role: 'admin',
      tenantId: TENANT_MASTER_ID,
    });
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();
    await wrapped(req, res);
    expect(res._s()).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('token válido (usuário existe, ativo, versões iguais) continua funcionando', async () => {
    const handler = vi.fn(async (req: any, res: any) => {
      expect(req.tenantUser.id).toBe('u1');
      return res.status(200).json({ success: true });
    });
    const wrapped = withTenant(handler);
    mockDb({ userRow: USER_ROW });
    const token = makeToken({
      id: 'u1',
      email: 'u@x.com',
      role: 'admin',
      tenantId: TENANT_MASTER_ID,
      token_version: 3,
    });
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();
    await wrapped(req, res);
    expect(res._s()).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('resolveTenantRequest também rejeita token com versão divergente', async () => {
    mockDb({ userRow: { ...USER_ROW, token_version: 99 } });
    const token = makeToken({
      id: 'u1',
      email: 'u@x.com',
      role: 'admin',
      tenantId: TENANT_MASTER_ID,
      token_version: 1,
    });
    const req = mockReq({ authorization: `Bearer ${token}` });
    const result = await resolveTenantRequest(req);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
    }
  });

  it('resolveTenantRequest aceita token válido', async () => {
    mockDb({ userRow: USER_ROW });
    const token = makeToken({
      id: 'u1',
      email: 'u@x.com',
      role: 'admin',
      tenantId: TENANT_MASTER_ID,
      token_version: 3,
    });
    const req = mockReq({ authorization: `Bearer ${token}` });
    const result = await resolveTenantRequest(req);
    expect(result.ok).toBe(true);
  });

  it('cache de 30s: segunda chamada não repete a query de usuário', async () => {
    const handler = vi.fn(async (_req: any, res: any) => res.status(200).json({ success: true }));
    const wrapped = withTenant(handler);
    mockDb({ userRow: USER_ROW });
    const token = makeToken({
      id: 'u1',
      email: 'u@x.com',
      role: 'admin',
      tenantId: TENANT_MASTER_ID,
      token_version: 3,
    });
    await wrapped(mockReq({ authorization: `Bearer ${token}` }), mockRes());
    await wrapped(mockReq({ authorization: `Bearer ${token}` }), mockRes());
    const userQueries = vi
      .mocked(sql)
      .mock.calls.filter((c: any) => Array.isArray(c[0]) && c[0].join('?').includes('FROM users'));
    expect(userQueries.length).toBe(1);
  });
});

describe('S-05: expiração do JWT emitido no login (8 horas)', () => {
  it('jwt.sign do login usa expiresIn 8h (não 7d)', async () => {
    const { handleAuth } = await import('../auth.js');
    const bcrypt = (await import('bcryptjs')).default;
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
        token_version: 0,
        ativo: true,
      },
    ]);
    const { loginRateLimit } = await import('../middleware/rateLimiter.js');
    vi.mocked(loginRateLimit as any).mockResolvedValue(true);
    const req: any = {
      method: 'POST',
      query: { action: 'login' },
      body: { email: 'admin@test.com', password: '123456' },
    };
    const res = mockRes();
    await handleAuth(req, res);
    expect(res._s()).toBe(200);
    const token = res._d().data.token;
    const decoded: any = jwt.decode(token);
    expect(decoded.token_version).toBe(0);
    const lifetimeSec = decoded.exp - decoded.iat;
    expect(lifetimeSec).toBe(8 * 3600);
  });
});

describe('S-05: troca de senha e delete invalidam token antigo', () => {
  const ADMIN_ROW = {
    id: 'u-admin',
    tenant_id: TENANT_MASTER_ID,
    ativo: true,
    token_version: 0,
  };

  beforeEach(() => {
    vi.mocked(sql).mockReset();
    __clearUserSessionCache();
  });

  it('PATCH com password incrementa token_version no SQL', async () => {
    const { handleUsers } = await import('../auth.js');
    mockDb({ userRow: ADMIN_ROW });
    const passwordQueries: string[] = [];
    vi.mocked(sql).begin = vi.fn(async (cb: any) => {
      const tx: any = (s: any, ..._v: any[]) => {
        if (Array.isArray(s) && s[0]?.includes('set_config')) return Promise.resolve([]);
        const text = s.join(' ');
        if (text.includes('password_hash')) passwordQueries.push(text);
        if (text.includes('UPDATE users SET') && text.includes('name = COALESCE')) {
          return Promise.resolve([{ id: 'u-target', name: 'X', email: 'x@x.com', role: 'user' }]);
        }
        return Promise.resolve([]);
      };
      return cb(tx);
    });
    const token = makeToken({
      id: 'u-admin',
      email: 'admin@x.com',
      role: 'admin',
      tenantId: TENANT_MASTER_ID,
      token_version: 0,
    });
    const req: any = {
      method: 'PATCH',
      query: { id: 'u-target' },
      body: { password: 'nova-senha-forte' },
      headers: { authorization: `Bearer ${token}` },
    };
    const res = mockRes();
    await handleUsers(req, res);
    expect(res._s()).toBe(200);
    expect(passwordQueries.length).toBeGreaterThan(0);
    expect(passwordQueries[0]).toContain('token_version = token_version + 1');
  });

  it('DELETE de usuário limpa o cache de sessão (próxima req → 401)', async () => {
    const { handleUsers } = await import('../auth.js');
    const adminToken = makeToken({
      id: 'u-admin',
      email: 'admin@x.com',
      role: 'admin',
      tenantId: TENANT_MASTER_ID,
      token_version: 0,
    });
    const victimToken = makeToken({
      id: 'u1',
      email: 'victim@x.com',
      role: 'user',
      tenantId: TENANT_MASTER_ID,
      token_version: 3,
    });

    // Sessão da vítima em cache (token ainda válido antes do delete)
    mockDb({ userRow: USER_ROW });
    const warmHandler = vi.fn(async (_q: any, r: any) => r.status(200).json({ success: true }));
    await withTenant(warmHandler)(mockReq({ authorization: `Bearer ${victimToken}` }), mockRes());
    expect(warmHandler).toHaveBeenCalledOnce();

    // Admin (sessão OK) deleta a vítima
    mockDb({ userRow: ADMIN_ROW });
    vi.mocked(sql).begin = vi.fn(async (cb: any) => {
      const tx: any = (s: any) => {
        if (Array.isArray(s) && s[0]?.includes('set_config')) return Promise.resolve([]);
        return Promise.resolve([]);
      };
      return cb(tx);
    });
    const delReq: any = {
      method: 'DELETE',
      query: { id: 'u1' },
      headers: { authorization: `Bearer ${adminToken}` },
    };
    const delRes = mockRes();
    await handleUsers(delReq, delRes);
    expect(delRes._s()).toBe(200);

    // após delete, token antigo da vítima → 401 (cache limpo + user ausente)
    mockDb({ userRow: undefined });
    const handler = vi.fn();
    const res2 = mockRes();
    await withTenant(handler)(mockReq({ authorization: `Bearer ${victimToken}` }), res2);
    expect(res2._s()).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });
});
