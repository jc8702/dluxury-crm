import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleSignup, provisionarTenant } from '../tenant-provisioning.js';

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
    vi.mocked(sql).mockReset();
    mockCriarCliente.mockReset();
    mockCriarAssinatura.mockReset();
    mockConsultarStatusAssinatura.mockReset();
    process.env.APP_JWT_SECRET = 'test-secret';
  });

  describe('provisionarTenant', () => {
    const validParams = {
      empresa: 'Minha Empresa',
      subdominio: 'minha-empresa',
      email: 'admin@empresa.com',
      senha: 'password123',
      nomeAdmin: 'Carlos Silva',
      plano: 'pro' as const,
    };

    it('deve rejeitar empresa vazia', async () => {
      await expect(provisionarTenant({ ...validParams, empresa: '' }))
        .rejects.toThrow('Nome da empresa é obrigatório.');
    });

    it('deve rejeitar subdomínio inválido (caracteres especiais)', async () => {
      await expect(provisionarTenant({ ...validParams, subdominio: 'Empresa Invalida!' }))
        .rejects.toThrow('O subdomínio deve conter apenas letras minúsculas, números e hífens.');
    });

    it('deve rejeitar subdomínio muito curto', async () => {
      await expect(provisionarTenant({ ...validParams, subdominio: 'ab' }))
        .rejects.toThrow('O subdomínio deve ter entre 3 e 30 caracteres.');
    });

    it('deve rejeitar subdomínio muito longo', async () => {
      await expect(provisionarTenant({ ...validParams, subdominio: 'a'.repeat(31) }))
        .rejects.toThrow('O subdomínio deve ter entre 3 e 30 caracteres.');
    });

    it('deve rejeitar subdomínio em blacklist', async () => {
      await expect(provisionarTenant({ ...validParams, subdominio: 'admin' }))
        .rejects.toThrow('Este subdomínio não está disponível para uso.');
    });

    it('deve rejeitar e-mail inválido', async () => {
      await expect(provisionarTenant({ ...validParams, email: 'emailinvalido' }))
        .rejects.toThrow('Formato de e-mail inválido.');
    });

    it('deve rejeitar senha curta', async () => {
      await expect(provisionarTenant({ ...validParams, senha: '123' }))
        .rejects.toThrow('A senha deve ter pelo menos 8 caracteres.');
    });

    it('deve rejeitar nome de administrador vazio', async () => {
      await expect(provisionarTenant({ ...validParams, nomeAdmin: '' }))
        .rejects.toThrow('Nome do administrador é obrigatório.');
    });

    it('deve rejeitar plano inválido', async () => {
      await expect(provisionarTenant({ ...validParams, plano: 'invalido' as any }))
        .rejects.toThrow('Plano inválido selecionado.');
    });

    it('deve rejeitar subdomínio já existente', async () => {
      vi.mocked(sql).mockResolvedValueOnce([{ id: 'tenant-existente' }]);

      await expect(provisionarTenant(validParams))
        .rejects.toThrow('Este subdomínio já está em uso.');
    });

    it('deve rejeitar e-mail já existente', async () => {
      vi.mocked(sql)
        .mockResolvedValueOnce([]) // subdominio livre
        .mockResolvedValueOnce([{ id: 'user-existente' }]); // email em uso

      await expect(provisionarTenant(validParams))
        .rejects.toThrow('Este e-mail já está cadastrado.');
    });

    it('deve provisionar tenant com sucesso utilizando Asaas real', async () => {
      vi.mocked(sql)
        .mockResolvedValueOnce([]) // subdominio livre
        .mockResolvedValueOnce([]); // email livre

      mockCriarCliente.mockResolvedValueOnce({ id: 'cus_real_123' });
      mockCriarAssinatura.mockResolvedValueOnce({ id: 'sub_real_123', invoiceUrl: 'http://invoice.real' });

      vi.mocked(sql).mockResolvedValue([]);

      const result = await provisionarTenant(validParams);

      expect(result).toBeDefined();
      expect(result.tenantId).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.invoiceUrl).toBe('http://invoice.real');
      expect(result.user.email).toBe('admin@empresa.com');
      expect(vi.mocked(sql)).toHaveBeenCalled();
    });

    it('deve provisionar tenant com sucesso utilizando fallback do Asaas em caso de erro na API do Asaas', async () => {
      vi.mocked(sql)
        .mockResolvedValueOnce([]) // subdominio livre
        .mockResolvedValueOnce([]); // email livre

      mockCriarCliente.mockRejectedValueOnce(new Error('Asaas Offline'));

      vi.mocked(sql).mockResolvedValue([]);

      const result = await provisionarTenant(validParams);

      expect(result).toBeDefined();
      expect(result.invoiceUrl).toContain('mock');
      expect(result.user.email).toBe('admin@empresa.com');
    });

    it('deve tentar fazer rollback manual de inserções caso ocorra um erro fatal no provisionamento', async () => {
      vi.mocked(sql).mockImplementation(async (strings: any) => {
        const qStr = Array.isArray(strings) ? strings.join('') : String(strings);
        if (qStr.includes('INSERT INTO tenants')) {
          throw new Error('Erro de conexão ao inserir tenant');
        }
        return [];
      });

      await expect(provisionarTenant(validParams))
        .rejects.toThrow('Erro de conexão ao inserir tenant');

      const deleteCalls = vi.mocked(sql).mock.calls.filter((call: any) => {
        const qStr = Array.isArray(call[0]) ? call[0].join('') : String(call[0]);
        return qStr.includes('DELETE FROM');
      });
      expect(deleteCalls.length).toBeGreaterThan(0);
    });
  });

  describe('handleSignup Rota API', () => {
    it('deve checar disponibilidade de subdomínio e retornar true se disponível', async () => {
      vi.mocked(sql).mockResolvedValueOnce([]); // livre

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

    it('deve retornar 400 se s não informado em check-subdomain', async () => {
      const req = {
        method: 'GET',
        url: '/api/signup/check-subdomain',
        query: {}
      };
      const res = mockRes();

      await handleSignup(req, res);

      expect(res._s()).toBe(400);
      expect(res._d().success).toBe(false);
      expect(res._d().error).toBe('Subdomínio não informado.');
    });

    it('deve retornar false na checagem se o subdomínio tiver formato inválido', async () => {
      const req = {
        method: 'GET',
        url: '/api/signup/check-subdomain?s=a',
        query: { s: 'a' }
      };
      const res = mockRes();

      await handleSignup(req, res);

      expect(res._s()).toBe(200);
      expect(res._d().success).toBe(true);
      expect(res._d().data.disponivel).toBe(false);
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

    it('deve processar POST para cadastrar tenant com sucesso', async () => {
      vi.mocked(sql)
        .mockResolvedValueOnce([]) // subdominio livre
        .mockResolvedValueOnce([]); // email livre

      mockCriarCliente.mockResolvedValueOnce({ id: 'cus_123' });
      mockCriarAssinatura.mockResolvedValueOnce({ id: 'sub_123', invoiceUrl: 'http://inv' });

      vi.mocked(sql).mockResolvedValue([]);

      const req = {
        method: 'POST',
        body: {
          empresa: 'Empresa Teste',
          subdominio: 'emp-teste',
          email: 'admin@empteste.com',
          senha: 'password123',
          nomeAdmin: 'Admin Teste',
          plano: 'basic'
        }
      };
      const res = mockRes();

      await handleSignup(req, res);

      expect(res._s()).toBe(201);
      expect(res._d().success).toBe(true);
      expect(res._d().data.tenantId).toBeDefined();
    });

    it('deve retornar 400 em caso de erro no POST', async () => {
      const req = {
        method: 'POST',
        body: {
          empresa: '', // inválido
        }
      };
      const res = mockRes();

      await handleSignup(req, res);

      expect(res._s()).toBe(400);
      expect(res._d().success).toBe(false);
      expect(res._d().error).toBeDefined();
    });

    it('deve retornar 405 se método não for GET/POST', async () => {
      const req = {
        method: 'PUT',
        url: '/api/signup',
      };
      const res = mockRes();

      await handleSignup(req, res);

      expect(res._s()).toBe(405);
      expect(res._d().success).toBe(false);
      expect(res._d().error).toBe('Método não permitido.');
    });
  });
});
