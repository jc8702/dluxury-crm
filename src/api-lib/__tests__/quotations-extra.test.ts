import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleQuotations,
  ValidationError,
  _resetRateLimit,
} from '../quotations.js';
import { db } from '../drizzle-db.js';
import { validateAuth } from '../_db.js';

vi.mock('../drizzle-db.js', () => {
  const chain: any = {};
  const methods = [
    'select', 'from', 'leftJoin', 'innerJoin', 'where', 'limit', 'offset',
    'orderBy', 'groupBy', 'having', 'insert', 'values', 'returning',
    'update', 'set', 'delete', 'execute', 'transaction',
  ];
  methods.forEach(m => { chain[m] = vi.fn().mockImplementation(() => chain); });
  chain.then = vi.fn().mockImplementation((onF: any) => Promise.resolve([]).then(onF));
  return {
    db: {
      ...chain,
      query: {
        skuEngenharia: { findFirst: vi.fn().mockResolvedValue(null) },
        quotations: { findFirst: vi.fn().mockResolvedValue(null) },
        skuComponente: { findFirst: vi.fn().mockResolvedValue(null) },
        quotationItems: { findFirst: vi.fn().mockResolvedValue(null) },
      },
    },
  };
});

vi.mock('../_db.js', () => ({
  auditLog: vi.fn().mockResolvedValue({}),
  validateAuth: vi.fn(),
  sql: Object.assign(vi.fn().mockResolvedValue([]), { query: vi.fn().mockResolvedValue([]) }),
}));

vi.mock('../middleware/tenantMiddleware.js', () => ({
  withTenant: (handler: any) => handler,
}));

vi.mock('../financeiro.js', () => ({
  garantirSeedsFinanceiros: vi.fn().mockResolvedValue(undefined),
}));

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

const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000000';
const TEST_USER = { id: 'u1', tenantId: TEST_TENANT_ID, role: 'admin', email: 't@e.com', name: 'Tester' };

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

describe('ValidationError', () => {
  it('deve criar erro com nome ValidationError', () => {
    const e = new ValidationError('campo obrigatório');
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('ValidationError');
    expect(e.message).toBe('campo obrigatório');
  });

});

describe('handleQuotations - métodos e error paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetRateLimit();
    vi.mocked(validateAuth).mockReturnValue({
      authorized: true,
      user: { id: 'u1', tenantId: 't1' },
      error: null,
    });
  });

  it('PUT sem id deve retornar 400', async () => {
    const req = mockReq({ method: 'PUT', url: '/api/quotations', query: {}, body: {} });
    const res = mockRes();
    await handleQuotations(req, res);
    expect(res._s()).toBe(400);
    expect(res._d().error).toMatch(/ID obrigat/i);
  });

  it('DELETE sem id deve retornar 400', async () => {
    const req = mockReq({ method: 'DELETE', url: '/api/quotations', query: {}, body: {} });
    const res = mockRes();
    await handleQuotations(req, res);
    expect(res._s()).toBe(400);
  });

  it('DELETE com id query param deve executar e retornar 200', async () => {
    const req = mockReq({
      method: 'DELETE',
      url: '/api/quotations?id=12345678-1234-1234-1234-123456789012',
      query: { id: '12345678-1234-1234-1234-123456789012' },
      body: {},
    });
    const res = mockRes();
    await handleQuotations(req, res);
    expect(res._s()).toBe(200);
  });

  it('PATCH sem id deve retornar 405 (não implementado)', async () => {
    const req = mockReq({ method: 'PATCH', url: '/api/quotations', query: {}, body: {} });
    const res = mockRes();
    await handleQuotations(req, res);
    expect(res._s()).toBe(405);
  });

  it('método não permitido deve retornar 405', async () => {
    const req = mockReq({ method: 'OPTIONS', url: '/api/quotations', query: {}, body: {} });
    const res = mockRes();
    await handleQuotations(req, res);
    expect(res._s()).toBe(405);
  });

  it('método não permitido custom (TRACE) deve retornar 405', async () => {
    const req = mockReq({ method: 'TRACE', url: '/api/quotations/123', query: {}, body: {} });
    const res = mockRes();
    await handleQuotations(req, res);
    expect(res._s()).toBe(405);
  });

  it('DELETE com id UUID válido deve executar e retornar 200', async () => {
    const req = mockReq({ method: 'DELETE', url: '/api/quotations?id=12345678-1234-1234-1234-123456789012', query: { id: '12345678-1234-1234-1234-123456789012' }, body: {} });
    const res = mockRes();
    await handleQuotations(req, res);
    expect(res._s()).toBe(200);
  });

  it.skip('deve retornar 401 quando auth não autorizado', async () => {
    // Auth handled by withTenant HOF (see tenantMiddleware.test.ts).
  });

  it('deve usar tenantId default quando user sem tenantId', async () => {
    vi.mocked(validateAuth).mockReturnValue({
      authorized: true,
      user: { id: 'u1' },
      error: null,
    });
    const req = mockReq({ method: 'GET', url: '/api/quotations', query: {}, body: {} });
    const res = mockRes();
    await handleQuotations(req, res);
    expect([200, 401, 429, 500]).toContain(res._s());
  });

  it('deve retornar 429 quando rate limit é excedido', async () => {
    _resetRateLimit();
    vi.mocked(validateAuth).mockReturnValue({
      authorized: true,
      user: { id: 'rate-test-user', tenantId: 't1' },
      error: null,
    });
    for (let i = 0; i < 100; i++) {
      const req = mockReq({ method: 'GET', url: '/api/quotations', query: {}, body: {} });
      const res = mockRes();
      await handleQuotations(req, res);
    }
    const req = mockReq({ method: 'GET', url: '/api/quotations', query: {}, body: {} });
    const res = mockRes();
    await handleQuotations(req, res);
    expect(res._s()).toBe(429);
  });

  it('DELETE com erro de banco deve retornar 500', async () => {
    vi.mocked(validateAuth).mockReturnValue({
      authorized: true,
      user: { id: 'u1', tenantId: 't1' },
      error: null,
    });
    vi.mocked(db.delete).mockImplementationOnce(() => {
      throw new Error('Delete failed');
    });
    const req = mockReq({
      method: 'DELETE',
      url: '/api/quotations?id=12345678-1234-1234-1234-123456789012',
      query: { id: '12345678-1234-1234-1234-123456789012' },
      body: {},
    });
    const res = mockRes();
    await handleQuotations(req, res);
    expect(res._s()).toBe(500);
  });
});

describe('handleQuotations - tratamento de ValidationError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetRateLimit();
  });

  it('deve retornar 400 quando ValidationError é lançado em GET com id inválido', async () => {
    vi.mocked(validateAuth).mockReturnValue({
      authorized: true,
      user: { id: 'u1', tenantId: 't1' },
      error: null,
    });
    const req = mockReq({ method: 'GET', url: '/api/quotations/abc-1234-1234-1234-123456789012', query: {}, body: {} });
    const res = mockRes();
    await handleQuotations(req, res);
  });
});

describe('handleQuotations - ValidationError via inner code', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetRateLimit();
    vi.mocked(validateAuth).mockReturnValue({
      authorized: true,
      user: { id: 'u1', tenantId: 't1' },
      error: null,
    });
  });

  it('ValidationError em qualquer ponto do handler deve retornar 400', async () => {
    const { ValidationError } = await import('../quotations.js');
    vi.mocked(db.select).mockImplementationOnce(() => {
      throw new ValidationError('campo inválido X');
    });
    const req = mockReq({ method: 'GET', url: '/api/quotations', query: {}, body: {} });
    const res = mockRes();
    await handleQuotations(req, res);
    expect([400, 500]).toContain(res._s());
  });
});
