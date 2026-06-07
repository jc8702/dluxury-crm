import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleClients, handleKanban } from '../crm.js';
import { handleFinanceiro } from '../financeiro.js';
import { handleEstoque } from '../estoque.js';

// Mocks do Banco de dados e autenticação
vi.mock('../_db.js', () => ({
  sql: vi.fn(),
  auditLog: vi.fn().mockResolvedValue({}),
  extractAndVerifyToken: vi.fn(),
}));

vi.mock('../middleware/tenantMiddleware.js', () => ({
  withTenant: (handler: any) => handler,
}));

const { sql } = await import('../_db.js');

function mockReq(overrides: any = {}): any {
  return {
    method: 'GET',
    headers: {},
    body: {},
    query: {},
    tenantId: '00000000-0000-0000-0000-000000000000',
    tenantUser: { id: 'u1', tenantId: '00000000-0000-0000-0000-000000000000', role: 'admin' },
    ...overrides,
  };
}

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

describe('Testes de Isolamento Multi-Tenant (Segurança de Escrita/Leitura)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Definir mock genérico de sql que resolve como array vazio para evitar crashes de .catch/destructuring
    vi.mocked(sql).mockResolvedValue([]);
  });

  describe('Módulo CRM - Clientes', () => {
    it('deve injetar o tenant_id correto do Tenant A ao listar clientes', async () => {
      // (validateAuth no longer used; set req.tenantId directly)
      const _tenantId = 'tenant-aaa-uuid'; const _userId = 'usr-a';

      const req = mockReq({ method: 'GET', url: '/api/clients', query: {}, tenantId: _tenantId, tenantUser: { id: _userId, tenantId: _tenantId, role: 'admin' } });
      const res = mockRes();

      await handleClients(req, res);

      expect(res._s()).toBe(200);
      expect(vi.mocked(sql)).toHaveBeenCalled();
      
      // Obter os argumentos da chamada sql
      const sqlCalls = vi.mocked(sql).mock.calls;
      const lastQueryArgs = sqlCalls[sqlCalls.length - 1];
      
      // O parâmetro 'tenant-aaa-uuid' deve estar presente nas variáveis interpoladas pela query
      expect(lastQueryArgs).toContain('tenant-aaa-uuid');
    });

    it('deve injetar o tenant_id correto do Tenant B ao listar clientes', async () => {
      // (validateAuth no longer used; set req.tenantId directly)
      const _tenantId = 'tenant-bbb-uuid'; const _userId = 'usr-b';

      const req = mockReq({ method: 'GET', url: '/api/clients', query: {}, tenantId: _tenantId, tenantUser: { id: _userId, tenantId: _tenantId, role: 'admin' } });
      const res = mockRes();

      await handleClients(req, res);

      expect(res._s()).toBe(200);
      
      const sqlCalls = vi.mocked(sql).mock.calls;
      const lastQueryArgs = sqlCalls[sqlCalls.length - 1];
      expect(lastQueryArgs).toContain('tenant-bbb-uuid');
      expect(lastQueryArgs).not.toContain('tenant-aaa-uuid');
    });

    it('deve barrar a alteração de cliente se pertencer a outro tenant', async () => {
      // (validateAuth no longer used; set req.tenantId directly)
      const _tenantId = 'tenant-aaa-uuid'; const _userId = 'usr-a';
      // Simular que SELECT na busca inicial do patch retorna vazio porque o id do cliente
      // pertence ao Tenant B, logo SELECT WHERE id = X AND tenant_id = Tenant A não encontra nada
      vi.mocked(sql).mockResolvedValueOnce([]); // Para a busca inicial no GET de clientes por id

      const req = mockReq({
        method: 'PATCH',
        url: '/api/clients?id=client-uuid-do-tenant-b',
        query: { id: 'client-uuid-do-tenant-b' },
        body: { nome: 'Nome Editado Tentativa Hacker' },
        tenantId: _tenantId,
        tenantUser: { id: _userId, tenantId: _tenantId, role: 'admin' }
      });
      const res = mockRes();

      await handleClients(req, res);

      expect(res._s()).toBe(404);
      expect(res._d().error).toBe('Cliente não encontrado');
    });
  });

  describe('Módulo CRM - Kanban', () => {
    it('deve filtrar itens do kanban pelo tenant_id correto', async () => {
      // (validateAuth no longer used; set req.tenantId directly)
      const _tenantId = 'tenant-aaa-uuid'; const _userId = 'usr-a';

      const req = mockReq({ method: 'GET', url: '/api/clients/kanban', query: {}, tenantId: _tenantId, tenantUser: { id: _userId, tenantId: _tenantId, role: 'admin' } });
      const res = mockRes();

      await handleKanban(req, res);

      expect(res._s()).toBe(200);

      const sqlCalls = vi.mocked(sql).mock.calls;
      const lastQueryArgs = sqlCalls[sqlCalls.length - 1];
      expect(lastQueryArgs).toContain('tenant-aaa-uuid');
    });
  });

  describe('Módulo Financeiro', () => {
    it('deve injetar o tenant_id correto do usuário autenticado no financeiro', async () => {
      // (validateAuth no longer used; set req.tenantId directly)
      const _tenantId = 'tenant-finance-uuid'; const _userId = 'usr-f';

      const req = mockReq({ method: 'GET', url: '/api/financeiro/classes', query: {}, tenantId: _tenantId, tenantUser: { id: _userId, tenantId: _tenantId, role: 'admin' } });
      const res = mockRes();

      await handleFinanceiro(req, res);

      // Como o financeiro pode carregar rotas internas com base na query
      expect(res._s()).toBe(200);
      expect(vi.mocked(sql)).toHaveBeenCalled();

      // Encontrar chamada sql que use o tenant_id
      const sqlCalls = vi.mocked(sql).mock.calls;
      const hasTenantId = sqlCalls.some((args: any) => args.includes('tenant-finance-uuid'));
      expect(hasTenantId).toBe(true);
    });
  });

  describe('Módulo Estoque', () => {
    it('deve listar materiais filtrando pelo tenant_id do usuário logado', async () => {
      // (validateAuth no longer used; set req.tenantId directly)
      const _tenantId = 'tenant-estoque-uuid'; const _userId = 'usr-e';

      const req = mockReq({ method: 'GET', url: '/api/estoque', query: {}, tenantId: _tenantId, tenantUser: { id: _userId, tenantId: _tenantId, role: 'admin' } });
      const res = mockRes();

      await handleEstoque(req, res);

      expect(res._s()).toBe(200);
      expect(vi.mocked(sql)).toHaveBeenCalled();
      
      const sqlCalls = vi.mocked(sql).mock.calls;
      const hasTenantId = sqlCalls.some((args: any) => args.includes('tenant-estoque-uuid'));
      expect(hasTenantId).toBe(true);
    });
  });
});
