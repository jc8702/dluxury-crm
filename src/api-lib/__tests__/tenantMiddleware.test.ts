import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

// Mock _db.js before importing the middleware
vi.mock('../_db.js', () => ({
  sql: vi.fn(),
  extractAndVerifyToken: vi.fn(),
  validateAuth: vi.fn(),
  resolveTenantByDomain: vi.fn(),
  auditLog: vi.fn(),
}));

// Mock Sentry to avoid network calls
vi.mock('@sentry/node', () => ({
  captureMessage: vi.fn(),
}));

const { sql, resolveTenantByDomain } = await import('../_db.js');
const { withTenant, resolveTenantRequest } = await import('../middleware/tenantMiddleware.js');
const { withTenantSql, tenantExists } = await import('../db/withTenant.js');
const { TENANT_MASTER_ID, isTenantId, asTenantId } = await import('../../types/tenant.js');

const JWT_SECRET = process.env.APP_JWT_SECRET || 'test-secret-key-for-jwt';

function makeToken(payload: any, opts: jwt.SignOptions = {}) {
  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h', ...opts });
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

describe('tenant types', () => {
  it('isTenantId accepts valid UUIDs', () => {
    expect(isTenantId('00000000-0000-0000-0000-000000000000')).toBe(true);
    expect(isTenantId('A1B2C3D4-E5F6-7890-1234-567890ABCDEF'.toLowerCase())).toBe(true);
  });

  it('isTenantId rejects invalid UUIDs', () => {
    expect(isTenantId('not-a-uuid')).toBe(false);
    expect(isTenantId('')).toBe(false);
    expect(isTenantId(null)).toBe(false);
    expect(isTenantId(undefined)).toBe(false);
    expect(isTenantId(123)).toBe(false);
  });

  it('asTenantId throws on invalid input', () => {
    expect(() => asTenantId('bad')).toThrow(/Invalid TenantId/);
  });

  it('TENANT_MASTER_ID is a valid TenantId', () => {
    expect(isTenantId(TENANT_MASTER_ID)).toBe(true);
  });
});

describe('withTenant middleware', () => {
  beforeEach(() => {
    vi.mocked(sql).mockReset();
    vi.mocked(resolveTenantByDomain).mockReset();
  });

  it('returns 401 when Authorization header is missing', async () => {
    const handler = vi.fn();
    const wrapped = withTenant(handler);
    const req = mockReq();
    const res = mockRes();
    await wrapped(req, res);
    expect(res._s()).toBe(401);
    expect(res._d()).toMatchObject({ success: false });
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header is malformed', async () => {
    const handler = vi.fn();
    const wrapped = withTenant(handler);
    const req = mockReq({ authorization: 'Basic abcdef' });
    const res = mockRes();
    await wrapped(req, res);
    expect(res._s()).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns 401 when JWT signature is invalid', async () => {
    const handler = vi.fn();
    const wrapped = withTenant(handler);
    const req = mockReq({
      authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
    });
    const res = mockRes();
    await wrapped(req, res);
    expect(res._s()).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns 401 when JWT is expired', async () => {
    const handler = vi.fn();
    const wrapped = withTenant(handler);
    const expiredToken = jwt.sign(
      { id: 'u1', email: 'u@x.com', role: 'admin', tenantId: TENANT_MASTER_ID, iat: 1, exp: 2 },
      JWT_SECRET,
      { algorithm: 'HS256' },
    );
    const req = mockReq({ authorization: `Bearer ${expiredToken}` });
    const res = mockRes();
    await wrapped(req, res);
    expect(res._s()).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns 403 when tenantId claim is missing', async () => {
    const handler = vi.fn();
    const wrapped = withTenant(handler);
    const token = makeToken({ id: 'u1', email: 'u@x.com', role: 'admin' });
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();
    await wrapped(req, res);
    expect(res._s()).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns 403 when tenantId claim is not a UUID', async () => {
    const handler = vi.fn();
    const wrapped = withTenant(handler);
    const token = makeToken({ id: 'u1', email: 'u@x.com', role: 'admin', tenantId: 'not-a-uuid' });
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();
    await wrapped(req, res);
    expect(res._s()).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns 403 when tenant does not exist in DB', async () => {
    const handler = vi.fn();
    const wrapped = withTenant(handler);
    vi.mocked(sql).mockImplementation(async (_strings: any) => {
      // tenantExists CTE returns empty
      return [];
    });
    const token = makeToken({
      id: 'u1',
      email: 'u@x.com',
      role: 'admin',
      tenantId: '11111111-1111-1111-1111-111111111111',
    });
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();
    await wrapped(req, res);
    expect(res._s()).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns 403 when role is not allowed', async () => {
    const handler = vi.fn();
    const wrapped = withTenant(handler, { requireRoles: ['admin'] });
    const token = makeToken({
      id: 'u1',
      email: 'u@x.com',
      role: 'user',
      tenantId: TENANT_MASTER_ID,
    });
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();
    await wrapped(req, res);
    expect(res._s()).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it('injects tenant context and calls handler when token + tenant + role OK', async () => {
    const handler = vi.fn(async (req: any, res: any) => {
      expect(req.tenantId).toBe(TENANT_MASTER_ID);
      expect(req.tenantUser.id).toBe('u1');
      expect(req.tenantUser.role).toBe('admin');
      expect(req.tenantSubdomain).toBe('main');
      expect(req.planoTier).toBe('pro');
      expect(req.isMasterAdmin).toBe(true);
      return res.status(200).json({ success: true });
    });
    const wrapped = withTenant(handler, { requireRoles: ['admin'] });
    const token = makeToken({
      id: 'u1',
      email: 'u@x.com',
      role: 'admin',
      tenantId: TENANT_MASTER_ID,
      planoTier: 'pro',
      subdominio: 'main',
    });
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();
    await wrapped(req, res);
    expect(res._s()).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('passes when no requireRoles is specified', async () => {
    const handler = vi.fn(async (req: any, res: any) => {
      expect(req.tenantId).toBe(TENANT_MASTER_ID);
      return res.status(200).json({ success: true });
    });
    const wrapped = withTenant(handler);
    const token = makeToken({
      id: 'u2',
      email: 'u2@x.com',
      role: 'user',
      tenantId: TENANT_MASTER_ID,
    });
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();
    await wrapped(req, res);
    expect(res._s()).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('enforces domain match when enforceDomainMatch=true', async () => {
    const handler = vi.fn();
    const wrapped = withTenant(handler, { enforceDomainMatch: true });
    vi.mocked(resolveTenantByDomain).mockResolvedValue({
      id: '22222222-2222-2222-2222-222222222222',
      nome: 'Other Tenant',
      subdominio: 'other',
    });
    const token = makeToken({
      id: 'u1',
      email: 'u@x.com',
      role: 'admin',
      tenantId: TENANT_MASTER_ID,
    });
    const req = mockReq({ authorization: `Bearer ${token}`, host: 'other.dluxury-crm.vercel.app' });
    const res = mockRes();
    await wrapped(req, res);
    expect(res._s()).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('tenantExists', () => {
  beforeEach(() => {
    vi.mocked(sql).mockReset();
  });

  it('returns true for the master tenant without a query', async () => {
    const exists = await tenantExists(sql as any, TENANT_MASTER_ID);
    expect(exists).toBe(true);
    expect(sql).not.toHaveBeenCalled();
  });

  it('returns true when the CTE returns at least one row', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: '11111111-1111-1111-1111-111111111111' }]);
    const exists = await tenantExists(sql as any, '11111111-1111-1111-1111-111111111111' as any);
    expect(exists).toBe(true);
  });

  it('returns false when the CTE returns no rows', async () => {
    vi.mocked(sql).mockResolvedValue([]);
    const exists = await tenantExists(sql as any, '11111111-1111-1111-1111-111111111111' as any);
    expect(exists).toBe(false);
  });
});

describe('withTenantSql', () => {
  beforeEach(() => {
    vi.mocked(sql).mockReset();
  });

  it('runs every query inside a transaction that sets app.tenant_id', async () => {
    let beginCalled = false;
    let setLocalCalled = false;
    const innerQueryResult: any = [{ id: 1 }];

    const fakeSql: any = (strings: any, ..._values: any[]) => {
      if (Array.isArray(strings) && strings[0]?.includes('SELECT 1')) {
        return Promise.resolve(innerQueryResult);
      }
      return Promise.resolve([]);
    };
    fakeSql.begin = async (cb: any) => {
      beginCalled = true;
      const tx: any = (s: any, ..._v: any[]) => {
        if (Array.isArray(s) && s[0]?.includes('set_config')) {
          setLocalCalled = true;
          return Promise.resolve([]);
        }
        return Promise.resolve(innerQueryResult);
      };
      return cb(tx);
    };

    const tdb = withTenantSql({ tenantId: TENANT_MASTER_ID }, fakeSql);
    const result = await tdb.query`SELECT 1`;

    expect(beginCalled).toBe(true);
    expect(setLocalCalled).toBe(true);
    expect(result).toBe(innerQueryResult);
    expect(tdb.tenantId).toBe(TENANT_MASTER_ID);
  });
});

describe('resolveTenantRequest', () => {
  beforeEach(() => {
    vi.mocked(sql).mockReset();
  });

  it('returns ok=true with augmented req on valid token + master tenant', async () => {
    const token = makeToken({
      id: 'u1',
      email: 'u@x.com',
      role: 'admin',
      tenantId: TENANT_MASTER_ID,
    });
    const req = mockReq({ authorization: `Bearer ${token}` });
    const result = await resolveTenantRequest(req);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.req.tenantId).toBe(TENANT_MASTER_ID);
      expect(result.req.tenantUser.id).toBe('u1');
    }
  });

  it('returns ok=false when token is missing', async () => {
    const req = mockReq();
    const result = await resolveTenantRequest(req);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
    }
  });

  it('returns ok=false when role is not allowed', async () => {
    const token = makeToken({
      id: 'u1',
      email: 'u@x.com',
      role: 'user',
      tenantId: TENANT_MASTER_ID,
    });
    const req = mockReq({ authorization: `Bearer ${token}` });
    const result = await resolveTenantRequest(req, { requireRoles: ['admin'] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });
});
