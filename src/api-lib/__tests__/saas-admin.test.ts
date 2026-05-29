import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleSaaSAdmin } from '../saas-admin.js';

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

describe('SaaS Admin API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar 401 se usuário não autenticado', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: false, user: null, error: 'Token inválido' });
    const req = { method: 'GET', url: '/api/saas-admin/tenants' };
    const res = mockRes();

    await handleSaaSAdmin(req, res);

    expect(res._s()).toBe(401);
  });

  it('deve retornar 403 se usuário autenticado mas não é do tenant master nem admin global', async () => {
    vi.mocked(validateAuth).mockReturnValue({
      authorized: true,
      user: { id: 'u-1', email: 'regular@tenant.com', role: 'admin', tenantId: 'some-other-tenant-uuid' },
      error: null
    });
    const req = { method: 'GET', url: '/api/saas-admin/tenants' };
    const res = mockRes();

    await handleSaaSAdmin(req, res);

    expect(res._s()).toBe(403);
  });

  it('deve permitir listar tenants se for o master tenant admin', async () => {
    vi.mocked(validateAuth).mockReturnValue({
      authorized: true,
      user: { id: 'admin-master', email: 'admin@dluxury.com', role: 'admin', tenantId: '00000000-0000-0000-0000-000000000000' },
      error: null
    });
    vi.mocked(sql).mockResolvedValue([
      {
        id: 'tenant-1',
        nome: 'EMPRESA TESTE',
        subdominio: 'empresa',
        dominio_personalizado: null,
        plano_tier: 'pro',
        tenant_status: 'ativo',
        tenant_created_at: new Date().toISOString(),
        subscription_id: 'sub-1',
        subscription_status: 'active',
        subscription_plano: 'pro',
        subscription_valor: '197.00',
        dia_vencimento: 5,
        current_period_end: new Date().toISOString()
      }
    ]);

    const req = { method: 'GET', url: '/api/saas-admin/tenants' };
    const res = mockRes();

    await handleSaaSAdmin(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    expect(res._d().data.length).toBe(1);
    expect(res._d().data[0].nome).toBe('EMPRESA TESTE');
  });

  it('deve permitir atualizar dados do tenant e assinatura via PATCH', async () => {
    vi.mocked(validateAuth).mockReturnValue({
      authorized: true,
      user: { id: 'admin-master', email: 'admin@dluxury.com', role: 'admin', tenantId: '00000000-0000-0000-0000-000000000000' },
      error: null
    });
    vi.mocked(sql)
      .mockResolvedValueOnce([{ id: 'tenant-uuid' }]) // Verifica se o tenant existe
      .mockResolvedValueOnce([]) // Update tenants
      .mockResolvedValueOnce([{ id: 'sub-uuid' }]) // Verifica se a sub existe
      .mockResolvedValueOnce([]); // Update subscriptions

    const req = {
      method: 'PATCH',
      url: '/api/saas-admin/tenants',
      body: {
        tenantId: 'tenant-uuid',
        planoTier: 'enterprise',
        status: 'ativo',
        diaVencimento: 10,
        valor: 397.00
      }
    };
    const res = mockRes();

    await handleSaaSAdmin(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
  });

  it('deve cadastrar novo usuário subordinado no tenant de destino', async () => {
    vi.mocked(validateAuth).mockReturnValue({
      authorized: true,
      user: { id: 'admin-master', email: 'admin@dluxury.com', role: 'admin', tenantId: '00000000-0000-0000-0000-000000000000' },
      error: null
    });
    vi.mocked(sql)
      .mockResolvedValueOnce([{ id: 'target-tenant-uuid' }]) // check tenant
      .mockResolvedValueOnce([]) // check email unique
      .mockResolvedValueOnce([]); // insert user

    const req = {
      method: 'POST',
      url: '/api/saas-admin/users',
      body: {
        tenantId: 'target-tenant-uuid',
        name: 'Novo Colaborador',
        email: 'colab@target.com',
        role: 'vendedor',
        password: 'securePassword123'
      }
    };
    const res = mockRes();

    await handleSaaSAdmin(req, res);

    expect(res._s()).toBe(201);
    expect(res._d().success).toBe(true);
    expect(res._d().data.name).toBe('NOVO COLABORADOR');
    expect(res._d().data.email).toBe('colab@target.com');
  });
});
