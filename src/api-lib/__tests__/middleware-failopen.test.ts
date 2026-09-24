import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../_db.js', () => ({
  sql: vi.fn(),
  validateAuth: vi.fn(),
}));

vi.mock('../logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const { verifyFeatureGate } = await import('../feature-gate-middleware.js');
const { verifyBillingStatus } = await import('../billing-middleware.js');
const { sql, validateAuth } = await import('../_db.js');
const { logger } = await import('../logger.js');

function mockRes() {
  let sc = 200,
    jd: any = null;
  const self: any = {
    status: vi.fn((code: number) => {
      sc = code;
      return self;
    }),
    json: vi.fn((data: any) => {
      jd = data;
      return self;
    }),
    end: vi.fn(() => self),
    _s: () => sc,
    _d: () => jd,
  };
  return self;
}

const authOk = {
  authorized: true,
  user: { id: 'usr-1', tenantId: 'tenant-1' },
  error: null,
};

function dbDown() {
  vi.mocked(validateAuth).mockReturnValue(authOk as any);
  vi.mocked(sql).mockRejectedValue(new Error('DB connection failed'));
}

describe('S-07: fail-closed 503 quando o banco falha (feature-gate + billing)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('feature-gate-middleware', () => {
    it('GET com falha de banco retorna 503 (fail-closed)', async () => {
      dbDown();
      const req = { method: 'GET', url: '/api/clients', query: {} };
      const res = mockRes();

      const result = await verifyFeatureGate(req, res);

      expect(result).toBe(false);
      expect(res._s()).toBe(503);
      expect(res._d().success).toBe(false);
    });

    it('POST com falha de banco retorna 503 (fail-closed)', async () => {
      dbDown();
      const req = { method: 'POST', url: '/api/clients', query: {} };
      const res = mockRes();

      const result = await verifyFeatureGate(req, res);

      expect(result).toBe(false);
      expect(res._s()).toBe(503);
    });

    it('/api/ping (rota pública) não é afetada: true e nenhuma consulta ao banco', async () => {
      vi.mocked(sql).mockRejectedValue(new Error('DB connection failed'));
      const req = { method: 'GET', url: '/api/ping', query: {} };
      const res = mockRes();

      const result = await verifyFeatureGate(req, res);

      expect(result).toBe(true);
      expect(res.status).not.toHaveBeenCalled();
      expect(sql).not.toHaveBeenCalled();
    });

    it('outras rotas públicas (/api/auth, /api/webhooks) não consultam o banco', async () => {
      vi.mocked(sql).mockRejectedValue(new Error('DB connection failed'));

      const res1 = mockRes();
      const r1 = await verifyFeatureGate(
        { method: 'GET', url: '/api/auth', query: { action: 'me' } },
        res1,
      );
      expect(r1).toBe(true);
      expect(res1.status).not.toHaveBeenCalled();

      const res2 = mockRes();
      const r2 = await verifyFeatureGate(
        { method: 'POST', url: '/api/webhooks/asaas', query: {} },
        res2,
      );
      expect(r2).toBe(true);
      expect(res2.status).not.toHaveBeenCalled();

      expect(sql).not.toHaveBeenCalled();
    });

    it('log estruturado no catch, sem stack nem credenciais', async () => {
      dbDown();
      const req = { method: 'GET', url: '/api/clients', query: {} };
      const res = mockRes();

      await verifyFeatureGate(req, res);

      expect(logger.error).toHaveBeenCalledTimes(1);
      const [tag, meta] = vi.mocked(logger.error).mock.calls[0] as [string, any];
      expect(tag).toBe('[FEATURE_GATE_MIDDLEWARE_ERROR]');
      expect(meta).toMatchObject({ method: 'GET', path: '/api/clients' });
      expect(meta).not.toHaveProperty('stack');
      expect(meta).not.toHaveProperty('user');
      expect(meta).not.toHaveProperty('tenantId');
      expect(JSON.stringify(meta)).not.toMatch(/bearer |authorization|api[_-]?key|password/i);
    });
  });

  describe('billing-middleware', () => {
    it('GET com falha de banco retorna 503 (fail-closed)', async () => {
      dbDown();
      const req = { method: 'GET', url: '/api/clients' };
      const res = mockRes();

      const result = await verifyBillingStatus(req, res);

      expect(result).toBe(false);
      expect(res._s()).toBe(503);
      expect(res._d().success).toBe(false);
    });

    it('POST com falha de banco retorna 503 (fail-closed)', async () => {
      dbDown();
      const req = { method: 'POST', url: '/api/clients' };
      const res = mockRes();

      const result = await verifyBillingStatus(req, res);

      expect(result).toBe(false);
      expect(res._s()).toBe(503);
    });

    it('/api/ping (rota pública) não é afetada: true e nenhuma consulta ao banco', async () => {
      vi.mocked(sql).mockRejectedValue(new Error('DB connection failed'));
      const req = { method: 'POST', url: '/api/ping' };
      const res = mockRes();

      const result = await verifyBillingStatus(req, res);

      expect(result).toBe(true);
      expect(res.status).not.toHaveBeenCalled();
      expect(sql).not.toHaveBeenCalled();
    });

    it('GET com assinatura suspended continua liberado (modo somente leitura)', async () => {
      vi.mocked(validateAuth).mockReturnValue(authOk as any);
      vi.mocked(sql).mockResolvedValue([
        { status: 'suspended', current_period_end: new Date().toISOString() },
      ]);
      const req = { method: 'GET', url: '/api/clients' };
      const res = mockRes();

      const result = await verifyBillingStatus(req, res);

      expect(result).toBe(true);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('POST com assinatura suspended continua bloqueado com 402', async () => {
      vi.mocked(validateAuth).mockReturnValue(authOk as any);
      vi.mocked(sql).mockResolvedValue([
        { status: 'suspended', current_period_end: new Date().toISOString() },
      ]);
      const req = { method: 'POST', url: '/api/clients' };
      const res = mockRes();

      const result = await verifyBillingStatus(req, res);

      expect(result).toBe(false);
      expect(res._s()).toBe(402);
    });

    it('log estruturado no catch, sem stack nem credenciais', async () => {
      dbDown();
      const req = { method: 'POST', url: '/api/clients' };
      const res = mockRes();

      await verifyBillingStatus(req, res);

      expect(logger.error).toHaveBeenCalledTimes(1);
      const [tag, meta] = vi.mocked(logger.error).mock.calls[0] as [string, any];
      expect(tag).toBe('[BILLING_MIDDLEWARE_ERROR]');
      expect(meta).toMatchObject({ method: 'POST', path: '/api/clients' });
      expect(meta).not.toHaveProperty('stack');
      expect(meta).not.toHaveProperty('user');
      expect(meta).not.toHaveProperty('tenantId');
      expect(JSON.stringify(meta)).not.toMatch(/bearer |authorization|api[_-]?key|password/i);
    });
  });
});
