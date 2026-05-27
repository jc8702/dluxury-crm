import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyFeatureGate } from '../feature-gate-middleware.js';

// Mocks do Banco de dados e autenticação
vi.mock('../_db.js', () => ({
  sql: vi.fn(),
  validateAuth: vi.fn(),
}));

const { sql, validateAuth } = await import('../_db.js');

function mockRes() {
  let sc = 200, jd: any = null;
  const self: any = {
    status: vi.fn((code: number) => { sc = code; return self; }),
    json: vi.fn((data: any) => { jd = data; return self; }),
    end: vi.fn(() => self),
    _s: () => sc,
    _d: () => jd,
  };
  return self;
}

describe('Testes de Feature Gates por Plano Comercial (SaaS)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Validação de Bloqueio por Feature Gates', () => {
    it('deve barrar acesso a rotas de IA para planos BASIC', async () => {
      vi.mocked(validateAuth).mockReturnValueOnce({
        authorized: true,
        user: { tenantId: 'tenant-basic-uuid', id: 'usr-b' }
      } as any);

      // Simular que o plano do tenant é 'basic'
      vi.mocked(sql).mockResolvedValueOnce([{ plano_tier: 'basic' }]);

      const req = { method: 'POST', url: '/api/ai/chat', query: {} };
      const res = mockRes();

      const result = await verifyFeatureGate(req, res);

      expect(result).toBe(false);
      expect(res._s()).toBe(403);
      expect(res._d().error).toContain("funcionalidade 'ia' não está inclusa");
    });

    it('deve permitir acesso a rotas de IA para planos PRO', async () => {
      vi.mocked(validateAuth).mockReturnValueOnce({
        authorized: true,
        user: { tenantId: 'tenant-pro-uuid', id: 'usr-p' }
      } as any);

      // Simular que o plano do tenant é 'pro'
      vi.mocked(sql).mockResolvedValueOnce([{ plano_tier: 'pro' }]);

      const req = { method: 'POST', url: '/api/ai/chat', query: {} };
      const res = mockRes();

      const result = await verifyFeatureGate(req, res);

      expect(result).toBe(true);
      expect(res._s()).toBe(200);
    });

    it('deve barrar acesso ao Simulador CNC 3D para planos PRO', async () => {
      vi.mocked(validateAuth).mockReturnValueOnce({
        authorized: true,
        user: { tenantId: 'tenant-pro-uuid', id: 'usr-p' }
      } as any);

      // Simular que o plano do tenant é 'pro'
      vi.mocked(sql).mockResolvedValueOnce([{ plano_tier: 'pro' }]);

      const req = { method: 'GET', url: '/api/simulations', query: {} };
      const res = mockRes();

      const result = await verifyFeatureGate(req, res);

      expect(result).toBe(false);
      expect(res._s()).toBe(403);
      expect(res._d().error).toContain("funcionalidade 'simulador_cnc' não está inclusa");
    });

    it('deve permitir acesso ao Simulador CNC 3D para planos ENTERPRISE', async () => {
      vi.mocked(validateAuth).mockReturnValueOnce({
        authorized: true,
        user: { tenantId: 'tenant-ent-uuid', id: 'usr-e' }
      } as any);

      // Simular que o plano do tenant é 'enterprise'
      vi.mocked(sql).mockResolvedValueOnce([{ plano_tier: 'enterprise' }]);

      const req = { method: 'GET', url: '/api/simulations', query: {} };
      const res = mockRes();

      const result = await verifyFeatureGate(req, res);

      expect(result).toBe(true);
      expect(res._s()).toBe(200);
    });
  });

  describe('Validação de Limites de Usuários por Plano', () => {
    it('deve barrar criação de usuário se plano BASIC atingir o limite de 2 usuários', async () => {
      vi.mocked(validateAuth).mockReturnValueOnce({
        authorized: true,
        user: { tenantId: 'tenant-basic-uuid', id: 'usr-b' }
      } as any);

      // 1ª query: busca plano_tier
      vi.mocked(sql).mockResolvedValueOnce([{ plano_tier: 'basic' }]);
      // 2ª query: conta usuários ativos do tenant (limite é 2)
      vi.mocked(sql).mockResolvedValueOnce([{ total: 2 }]);

      const req = { method: 'POST', url: '/api/users', query: {} };
      const res = mockRes();

      const result = await verifyFeatureGate(req, res);

      expect(result).toBe(false);
      expect(res._s()).toBe(403);
      expect(res._d().error).toContain("Seu plano atual (BASIC) permite no máximo 2 usuários");
    });

    it('deve permitir criação de usuário se plano BASIC tiver menos de 2 usuários', async () => {
      vi.mocked(validateAuth).mockReturnValueOnce({
        authorized: true,
        user: { tenantId: 'tenant-basic-uuid', id: 'usr-b' }
      } as any);

      // 1ª query: busca plano_tier
      vi.mocked(sql).mockResolvedValueOnce([{ plano_tier: 'basic' }]);
      // 2ª query: conta usuários ativos do tenant (tem 1 ativo)
      vi.mocked(sql).mockResolvedValueOnce([{ total: 1 }]);

      const req = { method: 'POST', url: '/api/users', query: {} };
      const res = mockRes();

      const result = await verifyFeatureGate(req, res);

      expect(result).toBe(true);
      expect(res._s()).toBe(200);
    });

    it('deve barrar criação de usuário se plano PRO atingir o limite de 5 usuários', async () => {
      vi.mocked(validateAuth).mockReturnValueOnce({
        authorized: true,
        user: { tenantId: 'tenant-pro-uuid', id: 'usr-p' }
      } as any);

      // 1ª query: busca plano_tier
      vi.mocked(sql).mockResolvedValueOnce([{ plano_tier: 'pro' }]);
      // 2ª query: conta usuários ativos do tenant (limite é 5)
      vi.mocked(sql).mockResolvedValueOnce([{ total: 5 }]);

      const req = { method: 'POST', url: '/api/users', query: {} };
      const res = mockRes();

      const result = await verifyFeatureGate(req, res);

      expect(result).toBe(false);
      expect(res._s()).toBe(403);
      expect(res._d().error).toContain("Seu plano atual (PRO) permite no máximo 5 usuários");
    });
  });
});
