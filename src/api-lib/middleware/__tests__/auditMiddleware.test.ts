import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockLogAudit = vi.fn().mockResolvedValue(undefined);

vi.mock('@vercel/functions', () => ({
  waitUntil: undefined,
}));

vi.mock('../../services/auditLogService.js', () => ({
  logAudit: mockLogAudit,
}));

const { auditMiddleware } = await import('../auditMiddleware.js');

const TENANT_ID = '00000000-0000-0000-0000-000000000000';
const USER_ID = '11111111-1111-1111-1111-111111111111';

function mockRes() {
  let sc = 200,
    jd: any = null,
    ended = false;
  const self: any = {
    status: vi.fn((c: number) => {
      sc = c;
      return self;
    }),
    json: vi.fn((d: any) => {
      jd = d;
      return self;
    }),
    end: vi.fn((d?: any) => {
      ended = true;
      return self;
    }),
    _s: () => sc,
    _d: () => jd,
    _e: () => ended,
  };
  return self;
}

function mockReq(overrides: any = {}) {
  return {
    method: 'POST',
    url: '/api/clients',
    headers: { 'x-forwarded-for': '192.168.1.1', 'user-agent': 'test-agent' },
    body: { nome: 'Teste', email: 'teste@test.com' },
    query: {},
    tenantId: TENANT_ID,
    tenantUser: { id: USER_ID, name: 'Tester' },
    ...overrides,
  };
}

describe('auditMiddleware', () => {
  beforeEach(() => {
    mockLogAudit.mockClear();
  });

  it('chama logAudit com tenantId em POST mutation', async () => {
    const req = mockReq({ method: 'POST' });
    const res = mockRes();

    auditMiddleware(req, res, () => {});
    await res.json({ success: true, data: { id: 'abc-123' } });

    expect(mockLogAudit).toHaveBeenCalledTimes(1);
    const call = mockLogAudit.mock.calls[0][0];
    expect(call.tenantId).toBe(TENANT_ID);
    expect(call.userId).toBe(USER_ID);
    expect(call.action).toBe('CREATE');
    expect(call.tableName).toBe('clients');
    expect(call.ipAddress).toBe('192.168.1.1');
    expect(call.userAgent).toBe('test-agent');
    expect(call.oldValues).toEqual({});
    expect(call.newValues).toEqual({ nome: 'Teste', email: 'teste@test.com' });
  });

  it('chama logAudit com action=DELETE em DELETE', async () => {
    const req = mockReq({ method: 'DELETE', url: '/api/clients/abc-123', body: { id: 'abc-123' } });
    const res = mockRes();

    auditMiddleware(req, res, () => {});
    await res.json({ success: true });

    expect(mockLogAudit).toHaveBeenCalledTimes(1);
    const call = mockLogAudit.mock.calls[0][0];
    expect(call.action).toBe('DELETE');
    expect(call.oldValues).toEqual({ id: 'abc-123' });
    expect(call.newValues).toEqual({});
  });

  it('NÃO chama logAudit para GET (não-mutation)', async () => {
    const req = mockReq({ method: 'GET' });
    const res = mockRes();

    auditMiddleware(req, res, () => {});
    await res.json({ success: true });

    expect(mockLogAudit).not.toHaveBeenCalled();
  });

  it('aguarda logAudit antes de res.json quando waitUntil não está disponível (fallback)', async () => {
    let auditResolved = false;
    mockLogAudit.mockImplementationOnce(async () => {
      auditResolved = true;
    });

    const req = mockReq({ method: 'POST' });
    const res = mockRes();

    auditMiddleware(req, res, () => {});
    await res.json({ success: true });

    expect(auditResolved).toBe(true);
    expect(res._d()).toEqual({ success: true });
  });

  it('intercepta res.end para mutations', async () => {
    const req = mockReq({ method: 'POST', body: { nome: 'Via End' } });
    const res = mockRes();

    auditMiddleware(req, res, () => {});
    res.end('OK');

    await vi.waitFor(() => {
      expect(mockLogAudit).toHaveBeenCalledTimes(1);
    });
    const call = mockLogAudit.mock.calls[0][0];
    expect(call.tenantId).toBe(TENANT_ID);
    expect(call.action).toBe('CREATE');
  });

  it('não audita duas vezes se res.json e res.end forem chamados', async () => {
    const req = mockReq({ method: 'POST' });
    const res = mockRes();

    auditMiddleware(req, res, () => {});
    await res.json({ success: true });
    res.end();

    expect(mockLogAudit).toHaveBeenCalledTimes(1);
  });

  it('não audita quando tenantId está ausente', async () => {
    const req = mockReq({ tenantId: undefined });
    const res = mockRes();

    auditMiddleware(req, res, () => {});
    await res.json({ success: true });

    expect(mockLogAudit).not.toHaveBeenCalled();
  });

  it('consistência de colunas: tenant_id, user_id, action, table_name, record_id', async () => {
    const req = mockReq({
      method: 'POST',
      url: '/api/projects',
      body: { id: '22222222-2222-2222-2222-222222222222', nome: 'Proj' },
    });
    const res = mockRes();

    auditMiddleware(req, res, () => {});
    await res.json({ success: true });

    expect(mockLogAudit).toHaveBeenCalledTimes(1);
    const call = mockLogAudit.mock.calls[0][0];
    expect(call).toMatchObject({
      tenantId: TENANT_ID,
      userId: USER_ID,
      action: 'CREATE',
      tableName: 'projects',
      recordId: '22222222-2222-2222-2222-222222222222',
    });
    expect(call.oldValues).toBeDefined();
    expect(call.newValues).toBeDefined();
    expect(call.ipAddress).toBeDefined();
    expect(call.userAgent).toBeDefined();
  });
});
