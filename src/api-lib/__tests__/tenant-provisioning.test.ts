import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleSignup, provisionarTenant } from '../tenant-provisioning.js';
import bcrypt from 'bcryptjs';

vi.mock('../_db.js', () => ({
  sql: vi.fn(),
}));

const { sql } = await import('../_db.js');

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

describe('Tenant Provisioning (Signup)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('provisionarTenant', () => {
    it('deve rejeitar subdomínio inválido ou em blacklist', async () => {
      await expect(provisionarTenant({
        empresa: 'Teste',
        subdominio: 'admin',
        email: 'admin@teste.com',
        senha: 'password123',
        nomeAdmin: 'Carlos',
        plano: 'pro'
      })).rejects.toThrow('Este subdomínio não está disponível para uso.');
    });

    it('deve rejeitar e-mail inválido', async () => {
      await expect(provisionarTenant({
        empresa: 'Teste',
        subdominio: 'marcenaria-ok',
        email: 'email-invalido',
        senha: 'password123',
        nomeAdmin: 'Carlos',
        plano: 'pro'
      })).rejects.toThrow('Formato de e-mail inválido.');
    });

    it('deve rejeitar senha curta', async () => {
      await expect(provisionarTenant({
        empresa: 'Teste',
        subdominio: 'marcenaria-ok',
        email: 'admin@teste.com',
        senha: '123',
        nomeAdmin: 'Carlos',
        plano: 'pro'
      })).rejects.toThrow('A senha deve ter pelo menos 8 caracteres.');
    });

    it('deve rejeitar subdomínio já existente', async () => {
      // Mock para simular que o tenant existe
      vi.mocked(sql).mockResolvedValueOnce([{ id: 'tenant-existente' }]);

      await expect(provisionarTenant({
        empresa: 'Teste',
        subdominio: 'existente',
        email: 'admin@teste.com',
        senha: 'password123',
        nomeAdmin: 'Carlos',
        plano: 'pro'
      })).rejects.toThrow('Este subdomínio já está em uso.');
    });
  });

  describe('handleSignup Rota API', () => {
    it('deve checar disponibilidade de subdomínio e retornar true se disponível', async () => {
      // Primeiro mock: tenants
      vi.mocked(sql).mockResolvedValueOnce([]); // Vazio = não existe subdominio

      const req = {
        method: 'GET',
        url: '/api/signup/check-subdomain?s=teste-novo',
        query: { s: 'teste-novo' }
      };
      const res = mockRes();

      await handleSignup(req, res);

      expect(res._s()).toBe(200);
      expect(res._d().success).toBe(true);
      expect(res._d().data.disponivel).toBe(true);
    });

    it('deve retornar false na checagem se o subdomínio estiver em blacklist', async () => {
      const req = {
        method: 'GET',
        url: '/api/signup/check-subdomain?s=admin',
        query: { s: 'admin' }
      };
      const res = mockRes();

      await handleSignup(req, res);

      expect(res._s()).toBe(200);
      expect(res._d().success).toBe(true);
      expect(res._d().data.disponivel).toBe(false);
    });
  });
});
