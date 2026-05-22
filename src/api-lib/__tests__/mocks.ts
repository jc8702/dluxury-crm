import { vi } from 'vitest';

export function createMockSql() {
  const mock = vi.fn() as any;

  // Tagged template: sql`SELECT ...` returns promise
  mock.mockImplementation(() => Promise.resolve([]));

  // Named queries used by handlers
  mock.query = vi.fn().mockResolvedValue([]);

  // Transaction support: sql.begin(async (tx) => { ... })
  mock.begin = vi.fn(async (cb: (tx: any) => Promise<any>) => {
    return await cb(mock);
  });

  return mock;
}

export function createMockRes() {
  let statusCode = 200;
  let jsonData: any = null;
  let ended = false;
  const self: any = {
    status: vi.fn((code: number) => {
      statusCode = code;
      return self;
    }),
    json: vi.fn((data: any) => {
      jsonData = data;
      return self;
    }),
    end: vi.fn(() => {
      ended = true;
      return self;
    }),
    _getStatus: () => statusCode,
    _getData: () => jsonData,
    _isEnded: () => ended,
  };
  return self;
}

export function createMockReq(overrides: Record<string, any> = {}) {
  return {
    method: 'GET',
    url: '/api/test',
    headers: {
      authorization: 'Bearer test-token',
      'content-type': 'application/json',
    },
    query: {},
    body: {},
    ...overrides,
  };
}

/**
 * Configura mocks globais do _db.js para um conjunto de testes.
 * Deve ser chamado no beforeEach de cada test suite.
 */
export function setupDbMocks() {
  const mockSql = createMockSql();
  const mockValidateAuth = vi.fn().mockResolvedValue({
    authorized: true,
    user: { id: 'test-user', name: 'Test User', role: 'admin' },
    error: null,
  });
  const mockExtractAndVerifyToken = vi.fn().mockReturnValue({
    user: { id: 'test-user', name: 'Test User', role: 'admin' },
    error: null,
  });
  const mockAuditLog = vi.fn().mockResolvedValue(undefined);

  vi.mock('../_db.js', () => ({
    sql: mockSql,
    validateAuth: mockValidateAuth,
    extractAndVerifyToken: mockExtractAndVerifyToken,
    auditLog: mockAuditLog,
  }));

  return { mockSql, mockValidateAuth, mockExtractAndVerifyToken, mockAuditLog };
}
