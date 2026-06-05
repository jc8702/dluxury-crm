import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleCheckout } from '../checkout.js';

// Mocks do Asaas como classe ES6 com propriedades globais
const mockCriarCliente = vi.fn();
const mockCriarAssinatura = vi.fn();
const mockConsultarStatusAssinatura = vi.fn();

vi.mock('../asaas-service.js', () => {
  return {
    AsaasService: class {
      criarCliente = mockCriarCliente;
      criarAssinatura = mockCriarAssinatura;
      consultarStatusAssinatura = mockConsultarStatusAssinatura;
    }
  };
});

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
    vi.mocked(sql).mockReset();
    vi.mocked(validateAuth).mockReset();
    mockCriarCliente.mockReset();
    mockCriarAssinatura.mockReset();
    mockConsultarStatusAssinatura.mockReset();
  });

  it('deve retornar 401 se usuário não autenticado', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: false, user: null, error: 'Token inválido' });
    const req = { method: 'GET', url: '/api/checkout' };
    const res = mockRes();

    await handleCheckout(req, res);

    expect(res._s()).toBe(401);
    expect(res._d().success).toBe(false);
  });

  it('deve retornar 400 se tenantId não identificado', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { tenantId: null } as any, error: null });
    const req = { method: 'GET', url: '/api/checkout' };
    const res = mockRes();

    await handleCheckout(req, res);

    expect(res._s()).toBe(400);
    expect(res._d().success).toBe(false);
    expect(res._d().error).toBe('Tenant não identificado no token.');
  });

  it('deve retornar dados de faturamento padrão (trial) no GET se nenhuma subscription existir', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { tenantId: '00000000-0000-0000-0000-000000000000' }, error: null });
    vi.mocked(sql).mockResolvedValue([]); // Nenhuma sub

    const req = { method: 'GET', url: '/api/checkout' };
    const res = mockRes();

    await handleCheckout(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    expect(res._d().data.status).toBe('trial');
    expect(res._d().data.plano).toBe('pro');
  });

  it('deve retornar dados do faturamento no GET', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { tenantId: '00000000-0000-0000-0000-000000000000' }, error: null });
    vi.mocked(sql).mockResolvedValue([
      {
        id: 'sub-123',
        status: 'active',
        plano: 'pro',
        valor: '197.00',
        dia_vencimento: 5,
        current_period_end: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        asaas_customer_id: 'cus_123',
        asaas_subscription_id: 'sub_123'
      }
    ]);

    const req = { method: 'GET', url: '/api/checkout' };
    const res = mockRes();

    await handleCheckout(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    expect(res._d().data.status).toBe('active');
    expect(res._d().data.plano).toBe('pro');
    expect(res._d().data.valor).toBe(197.00);
    expect(res._d().data.diasRestantes).toBeGreaterThanOrEqual(4);
  });

  it('deve retornar faturas virtuais vazias se não houver subscription em GET /invoices', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { tenantId: '00000000-0000-0000-0000-000000000000' }, error: null });
    vi.mocked(sql).mockResolvedValue([]);

    const req = { method: 'GET', url: '/api/checkout/invoices' };
    const res = mockRes();

    await handleCheckout(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    expect(res._d().data).toEqual([]);
  });

  it('deve retornar faturas virtuais geradas dinamicamente com status pendente se assinatura atrasada (overdue)', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { tenantId: '00000000-0000-0000-0000-000000000000' }, error: null });
    vi.mocked(sql).mockResolvedValue([
      { created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(), status: 'overdue', plano: 'pro', valor: '197.00', dia_vencimento: 5 }
    ]);

    const req = { method: 'GET', url: '/api/checkout/invoices' };
    const res = mockRes();

    await handleCheckout(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    expect(res._d().data.length).toBeGreaterThan(0);
    expect(res._d().data[0].status).toBe('pendente');
  });

  it('deve retornar faturas virtuais geradas dinamicamente com status cancelado se assinatura suspensa (suspended)', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { tenantId: '00000000-0000-0000-0000-000000000000' }, error: null });
    vi.mocked(sql).mockResolvedValue([
      { created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(), status: 'suspended', plano: 'pro', valor: '197.00', dia_vencimento: 5 }
    ]);

    const req = { method: 'GET', url: '/api/checkout/invoices' };
    const res = mockRes();

    await handleCheckout(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    expect(res._d().data.length).toBeGreaterThan(0);
    expect(res._d().data[0].status).toBe('cancelado');
  });

  it('deve cancelar a assinatura via POST /cancel', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { tenantId: '00000000-0000-0000-0000-000000000000' }, error: null });
    vi.mocked(sql).mockResolvedValue([]);

    const req = { method: 'POST', url: '/api/checkout/cancel' };
    const res = mockRes();

    await handleCheckout(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
  });

  it('deve simular emissão de boleto via POST /gerar-boleto', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { tenantId: '00000000-0000-0000-0000-000000000000' }, error: null });
    vi.mocked(sql).mockResolvedValue([
      { valor: '197.00', dia_vencimento: 5 }
    ]);

    const req = { method: 'POST', url: '/api/checkout/gerar-boleto' };
    const res = mockRes();

    await handleCheckout(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    expect(res._d().data.codigoBarras).toBeDefined();
  });

  describe('POST /api/checkout (Link de Pagamento / Recriação Asaas)', () => {
    it('deve retornar 404 se assinatura não for encontrada', async () => {
      vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { tenantId: '00000000-0000-0000-0000-000000000000' }, error: null });
      vi.mocked(sql).mockResolvedValue([]); // Sem subscription

      const req = { method: 'POST', url: '/api/checkout' };
      const res = mockRes();

      await handleCheckout(req, res);

      expect(res._s()).toBe(404);
      expect(res._d().success).toBe(false);
      expect(res._d().error).toBe('Assinatura não encontrada para este tenant.');
    });

    it('deve retornar link de pagamento consultando Asaas se asaas_subscription_id existir e for real', async () => {
      vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { tenantId: '00000000-0000-0000-0000-000000000000' }, error: null });
      vi.mocked(sql).mockResolvedValueOnce([
        { status: 'trial', plano: 'pro', valor: '197.00', asaas_customer_id: 'cus_123', asaas_subscription_id: 'sub_real_999' }
      ]);

      mockConsultarStatusAssinatura.mockResolvedValueOnce({ invoiceUrl: 'https://real-invoice-url' });

      const req = { method: 'POST', url: '/api/checkout' };
      const res = mockRes();

      await handleCheckout(req, res);

      expect(res._s()).toBe(200);
      expect(res._d().success).toBe(true);
      expect(res._d().data.invoiceUrl).toBe('https://real-invoice-url');
    });

    it('deve usar link de fallback em caso de erro na consulta ao Asaas para subscription existente', async () => {
      vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { tenantId: '00000000-0000-0000-0000-000000000000' }, error: null });
      vi.mocked(sql).mockResolvedValueOnce([
        { status: 'trial', plano: 'pro', valor: '197.00', asaas_customer_id: 'cus_123', asaas_subscription_id: 'sub_real_999' }
      ]);

      mockConsultarStatusAssinatura.mockRejectedValueOnce(new Error('API offline'));

      const req = { method: 'POST', url: '/api/checkout' };
      const res = mockRes();

      await handleCheckout(req, res);

      expect(res._s()).toBe(200);
      expect(res._d().data.invoiceUrl).toBe('https://sandbox.asaas.com/i/sub_real_999');
    });

    it('deve recriar cliente e assinatura no Asaas se asaas_subscription_id for mock ou ausente', async () => {
      vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { tenantId: '00000000-0000-0000-0000-000000000000' }, error: null });
      
      vi.mocked(sql).mockResolvedValueOnce([
        { status: 'trial', plano: 'pro', valor: '197.00', asaas_customer_id: 'cus_mock_123', asaas_subscription_id: 'sub_mock_123' }
      ]);

      vi.mocked(sql).mockResolvedValueOnce([
        { nome: 'Marcenaria Master', email: 'master@marcenaria.com' }
      ]);

      vi.mocked(sql).mockResolvedValueOnce([]);

      mockCriarCliente.mockResolvedValueOnce({ id: 'cus_novo_123' });
      mockCriarAssinatura.mockResolvedValueOnce({ id: 'sub_nova_123', invoiceUrl: 'https://new-invoice-url' });

      const req = { method: 'POST', url: '/api/checkout' };
      const res = mockRes();

      await handleCheckout(req, res);

      expect(res._s()).toBe(200);
      expect(res._d().success).toBe(true);
      expect(res._d().data.invoiceUrl).toBe('https://new-invoice-url');
    });

    it('deve usar fallback se a recriação do cliente/assinatura no Asaas falhar', async () => {
      vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { tenantId: '00000000-0000-0000-0000-000000000000' }, error: null });
      
      vi.mocked(sql).mockResolvedValueOnce([
        { status: 'trial', plano: 'pro', valor: '197.00', asaas_customer_id: null, asaas_subscription_id: null }
      ]);

      vi.mocked(sql).mockResolvedValueOnce([]); // mock tenant

      mockCriarCliente.mockRejectedValueOnce(new Error('Fatal error'));

      const req = { method: 'POST', url: '/api/checkout' };
      const res = mockRes();

      await handleCheckout(req, res);

      expect(res._s()).toBe(200);
      expect(res._d().data.invoiceUrl).toBe('https://sandbox.asaas.com/i/mock_recreate_pro');
    });
  });

  it('deve retornar 405 para métodos não permitidos', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { tenantId: '00000000-0000-0000-0000-000000000000' }, error: null });
    const req = { method: 'PUT', url: '/api/checkout' };
    const res = mockRes();

    await handleCheckout(req, res);

    expect(res._s()).toBe(405);
    expect(res._d().success).toBe(false);
  });

  it('deve retornar 500 em caso de erro fatal inesperado', async () => {
    vi.mocked(validateAuth).mockImplementation(() => {
      throw new Error('Erro catastrófico');
    });
    const req = { method: 'GET', url: '/api/checkout' };
    const res = mockRes();

    await handleCheckout(req, res);

    expect(res._s()).toBe(500);
    expect(res._d().success).toBe(false);
    expect(res._d().error).toBe('Erro catastrófico');
  });
});
