import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyBillingStatus } from '../billing-middleware.js';

vi.mock('../_db.js', () => ({
  sql: vi.fn(),
  validateAuth: vi.fn(),
}));

const { sql, validateAuth } = await import('../_db.js');

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

describe('verifyBillingStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve permitir GET livremente para qualquer rota', async () => {
    const req = { method: 'GET', url: '/api/clients' };
    const res = mockRes();
    const result = await verifyBillingStatus(req, res);
    expect(result).toBe(true);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('deve permitir OPTIONS livremente para qualquer rota', async () => {
    const req = { method: 'OPTIONS', url: '/api/clients' };
    const res = mockRes();
    const result = await verifyBillingStatus(req, res);
    expect(result).toBe(true);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('deve permitir rotas ignoradas como /api/auth mesmo com POST', async () => {
    const req = { method: 'POST', url: '/api/auth/login' };
    const res = mockRes();
    const result = await verifyBillingStatus(req, res);
    expect(result).toBe(true);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('deve permitir rotas ignoradas como /api/ping mesmo com POST', async () => {
    const req = { method: 'POST', url: '/api/ping' };
    const res = mockRes();
    const result = await verifyBillingStatus(req, res);
    expect(result).toBe(true);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('deve permitir se o usuario nao estiver autenticado (deixa o auth handler responder 401)', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: false, error: 'Unauthorized', user: null } as any);
    const req = { method: 'POST', url: '/api/clients' };
    const res = mockRes();
    const result = await verifyBillingStatus(req, res);
    expect(result).toBe(true);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('deve permitir escrita se o tenant tiver assinatura ativa', async () => {
    vi.mocked(validateAuth).mockReturnValue({
      authorized: true,
      user: { id: 'user-1', tenantId: 'tenant-1' }
    } as any);
    vi.mocked(sql).mockResolvedValue([{ status: 'active', current_period_end: new Date(Date.now() + 86400000) }]);

    const req = { method: 'POST', url: '/api/clients' };
    const res = mockRes();
    const result = await verifyBillingStatus(req, res);
    expect(result).toBe(true);
  });

  it('deve bloquear escrita (402) se a assinatura estiver suspended', async () => {
    vi.mocked(validateAuth).mockReturnValue({
      authorized: true,
      user: { id: 'user-1', tenantId: 'tenant-1' }
    } as any);
    vi.mocked(sql).mockResolvedValue([{ status: 'suspended', current_period_end: new Date() }]);

    const req = { method: 'POST', url: '/api/clients' };
    const res = mockRes();
    const result = await verifyBillingStatus(req, res);
    expect(result).toBe(false);
    expect(res._s()).toBe(402);
    expect(res._d().error).toContain('Assinatura suspensa');
  });

  it('deve permitir escrita se a assinatura estiver overdue mas dentro da tolerancia de 5 dias', async () => {
    vi.mocked(validateAuth).mockReturnValue({
      authorized: true,
      user: { id: 'user-1', tenantId: 'tenant-1' }
    } as any);
    // Venceu há 2 dias
    vi.mocked(sql).mockResolvedValue([{ status: 'overdue', current_period_end: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }]);

    const req = { method: 'POST', url: '/api/clients' };
    const res = mockRes();
    const result = await verifyBillingStatus(req, res);
    expect(result).toBe(true);
  });

  it('deve bloquear escrita (402) se a assinatura estiver overdue ha mais de 5 dias', async () => {
    vi.mocked(validateAuth).mockReturnValue({
      authorized: true,
      user: { id: 'user-1', tenantId: 'tenant-1' }
    } as any);
    // Venceu há 6 dias
    vi.mocked(sql).mockResolvedValue([{ status: 'overdue', current_period_end: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) }]);

    const req = { method: 'POST', url: '/api/clients' };
    const res = mockRes();
    const result = await verifyBillingStatus(req, res);
    expect(result).toBe(false);
    expect(res._s()).toBe(402);
    expect(res._d().error).toContain('tolerância de 5 dias');
  });
});
