import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleCheckout } from '../checkout.js';

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

describe('Checkout / Billing API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar 401 se usuário não autenticado', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: false, user: null, error: 'Token inválido' });
    const req = { method: 'GET' };
    const res = mockRes();

    await handleCheckout(req, res);

    expect(res._s()).toBe(401);
  });

  it('deve retornar dados do faturamento no GET', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { tenantId: 'tenant-test-id' }, error: null });
    vi.mocked(sql).mockResolvedValue([
      { id: '1', status: 'active', plano: 'pro', valor: '197.00', dia_vencimento: 5, current_period_end: new Date().toISOString(), asaas_customer_id: 'cus_123', asaas_subscription_id: 'sub_123' }
    ]);

    const req = { method: 'GET' };
    const res = mockRes();

    await handleCheckout(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    expect(res._d().data.plano).toBe('pro');
    expect(res._d().data.valor).toBe(197.00);
  });
});
