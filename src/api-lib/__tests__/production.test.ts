import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleProduction } from '../production.js';

vi.mock('../_db.js', () => ({
  sql: vi.fn(),
  validateAuth: vi.fn(),
  auditLog: vi.fn(),
}));

vi.mock('../middleware/tenantMiddleware.js', () => ({
  withTenant: (handler: any) => handler,
}));

vi.mock('../_productionForecasting.js', () => ({
  calcularPrevisaoEntrega: vi.fn(() => []),
}));

const { sql, validateAuth } = await import('../_db.js');

function mockRes() {
  let sc = 200,
    jd: any = null;
  const self: any = {
    status: vi.fn((c: number) => {
      sc = c;
      return self;
    }),
    json: vi.fn((d: any) => {
      jd = d;
      return self;
    }),
    end: vi.fn(() => self),
    _s: () => sc,
    _d: () => jd,
  };
  return self;
}

const MIGRATIONS = 8; // 7 ALTER TABLE + 1 UPDATE status

function mockMigrations() {
  for (let i = 0; i < MIGRATIONS; i++) {
    vi.mocked(sql).mockResolvedValueOnce([]);
  }
}

const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000000';
const TEST_USER = {
  id: 'u1',
  tenantId: TEST_TENANT_ID,
  role: 'admin',
  email: 't@e.com',
  name: 'Tester',
};

function mockReq(overrides: any = {}): any {
  return {
    method: 'GET',
    headers: {},
    body: {},
    query: {},
    tenantId: TEST_TENANT_ID,
    tenantUser: TEST_USER,
    ...overrides,
  };
}

describe('handleProduction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null });

    vi.mocked(sql).mockImplementation(() => Promise.resolve([]));
    sql.join = vi.fn((values: any[]) => values);
    sql.begin = vi.fn(async (cb: any) => cb(sql));
  });

  describe('GET', () => {
    it('deve listar OPs (GET list)', async () => {
      vi.mocked(sql).mockResolvedValue([
        {
          id: '1',
          op_id: 'OP-001',
          produto: 'Armário',
          status: 'AGUARDANDO',
          data_prevista_entrega: null,
        },
      ]);
      const req = mockReq({ method: 'GET', url: '/api/production/list', query: { id: 'list' } });
      const res = mockRes();
      await handleProduction(req, res);
      expect(res._s()).toBe(200);
      expect(res._d().data).toHaveLength(1);
    });

    it('deve retornar métricas (GET metrics)', async () => {
      vi.mocked(sql).mockResolvedValue([
        {
          id: '1',
          op_id: 'OP-001',
          produto: 'Armário',
          status: 'FINALIZADA',
          data_inicio: new Date(Date.now() - 86400000),
          data_fim: new Date(),
          data_prevista_entrega: null,
          tempo_previsto_corte: 0,
          tempo_previsto_montagem: 0,
        },
      ]);
      const req = mockReq({
        method: 'GET',
        url: '/api/production/metrics',
        query: { id: 'metrics' },
      });
      const res = mockRes();
      await handleProduction(req, res);
      expect(res._s()).toBe(200);
      expect(res._d().data).toHaveProperty('totalOPs');
      expect(res._d().data.totalOPs).toBe(1);
    });
  });

  describe('POST', () => {
    it('deve criar OP (POST)', async () => {
      vi.mocked(sql).mockResolvedValue([{ id: '1', op_id: 'OP-001', produto: 'Armário' }]);
      const req = mockReq({
        method: 'POST',
        url: '/api/production',
        query: {},
        body: { op_id: 'OP-001', produto: 'Armário' },
      });
      const res = mockRes();
      await handleProduction(req, res);
      expect(res._s()).toBe(201);
    });

    it('deve retornar 400 se dados insuficientes no POST', async () => {
      const req = mockReq({ method: 'POST', url: '/api/production', query: {}, body: {} });
      const res = mockRes();
      await handleProduction(req, res);
      expect(res._s()).toBe(400);
    });

    it('deve retornar 400 se apenas op_id sem produto', async () => {
      const req = mockReq({
        method: 'POST',
        url: '/api/production',
        query: {},
        body: { op_id: 'OP-002' },
      });
      const res = mockRes();
      await handleProduction(req, res);
      expect(res._s()).toBe(400);
    });
  });

  describe('PATCH (status)', () => {
    it('deve atualizar status da OP', async () => {
      mockMigrations();
      vi.mocked(sql)
        .mockResolvedValueOnce([
          {
            id: '1',
            op_id: 'OP-001',
            status: 'AGUARDANDO',
            checklist: '[]',
            metadata: '{}',
            data_inicio: null,
            data_fim: null,
          },
        ]) // SELECT before update
        .mockResolvedValueOnce([
          { id: '1', op_id: 'OP-001', status: 'PRODUCAO', data_inicio: new Date(), data_fim: null },
        ]); // UPDATE RETURNING
      const req = mockReq({
        method: 'PATCH',
        url: '/api/production/OP-001',
        query: {},
        body: { op_id: 'OP-001', status: 'PRODUCAO' },
      });
      const res = mockRes();
      await handleProduction(req, res);
      expect(res._s()).toBe(200);
    });

    it('deve retornar 404 se OP não encontrada no PATCH', async () => {
      mockMigrations();
      vi.mocked(sql).mockResolvedValueOnce([]);
      const req = mockReq({
        method: 'PATCH',
        query: { op_id: 'OP-999' },
        body: { op_id: 'OP-999', status: 'PRODUCAO' },
      });
      const res = mockRes();
      await handleProduction(req, res);
      expect(res._s()).toBe(404);
    });
  });

  describe('PATCH details', () => {
    it('deve atualizar detalhes da OP', async () => {
      mockMigrations();
      vi.mocked(sql)
        .mockResolvedValueOnce([
          {
            id: '1',
            op_id: 'OP-001',
            produto: 'Armário',
            pecas: 5,
            checklist: '[]',
            metadata: '{}',
          },
        ])
        .mockResolvedValueOnce([
          {
            id: '1',
            op_id: 'OP-001',
            produto: 'Armário V2',
            pecas: 5,
            checklist: '[]',
            metadata: '{}',
          },
        ]);
      const req = mockReq({
        method: 'PATCH',
        url: '/api/production/details',
        query: { id: 'details' },
        body: { op_id: 'OP-001', produto: 'Armário V2' },
      });
      const res = mockRes();
      await handleProduction(req, res);
      expect(res._s()).toBe(200);
    });

    it('deve retornar 404 se OP não encontrada no details', async () => {
      mockMigrations();
      vi.mocked(sql).mockResolvedValueOnce([]);
      const req = mockReq({
        method: 'PATCH',
        url: '/api/production/details',
        query: { id: 'details' },
        body: { op_id: 'OP-999' },
      });
      const res = mockRes();
      await handleProduction(req, res);
      expect(res._s()).toBe(404);
    });
  });

  describe('DELETE', () => {
    it('deve excluir OP', async () => {
      mockMigrations();
      vi.mocked(sql)
        .mockResolvedValueOnce([{ id: '1', op_id: 'OP-001', produto: 'Armário' }])
        .mockResolvedValueOnce(Promise.resolve());
      const req = mockReq({ method: 'DELETE', url: '/api/production', query: { op_id: 'OP-001' } });
      const res = mockRes();
      await handleProduction(req, res);
      expect(res._s()).toBe(200);
    });

    it('deve retornar 400 se op_id ausente no DELETE', async () => {
      const req = mockReq({ method: 'DELETE', url: '/api/production', query: {} });
      const res = mockRes();
      await handleProduction(req, res);
      expect(res._s()).toBe(400);
    });

    it('deve retornar 404 se OP não encontrada no DELETE', async () => {
      mockMigrations();
      vi.mocked(sql).mockResolvedValueOnce([]);
      const req = mockReq({ method: 'DELETE', url: '/api/production', query: { op_id: 'OP-999' } });
      const res = mockRes();
      await handleProduction(req, res);
      expect(res._s()).toBe(404);
    });
  });

  describe('Método não suportado', () => {
    it('deve retornar 405 se método não suportado', async () => {
      const req = mockReq({ method: 'PUT', url: '/api/production', query: {} });
      const res = mockRes();
      await handleProduction(req, res);
      expect(res._s()).toBe(405);
    });
  });

  describe('Auth e error handling', () => {
    it.skip('deve retornar 401 sem auth', async () => {
      vi.mocked(validateAuth).mockReturnValue({
        authorized: false,
        user: null,
        error: 'Sem token',
      });
      const req = mockReq({ method: 'GET', url: '/api/production', query: {} });
      const res = mockRes();
      await handleProduction(req, res);
      expect(res._s()).toBe(401);
    });

    it('deve usar tenantId default quando user sem tenantId', async () => {
      vi.mocked(validateAuth).mockReturnValue({
        authorized: true,
        user: { id: 'u1' },
        error: null,
      });
      vi.mocked(sql).mockResolvedValue([]);
      const req = mockReq({ method: 'GET', url: '/api/production', query: { id: 'list' } });
      const res = mockRes();
      await handleProduction(req, res);
      expect(res._s()).toBe(200);
    });

    it('deve retornar 500 em erro de banco', async () => {
      vi.mocked(validateAuth).mockReturnValue({
        authorized: true,
        user: { id: 'u1' },
        error: null,
      });
      vi.mocked(sql).mockImplementation(async () => {
        throw new Error('DB down');
      });
      const req = mockReq({ method: 'GET', url: '/api/production', query: { id: 'list' } });
      const res = mockRes();
      await handleProduction(req, res);
      expect(res._s()).toBe(500);
    });
  });

  describe('Auto-sync de previsões', () => {
    it('deve auto-sincronizar quando há OPs ativas sem data_prevista_entrega', async () => {
      vi.mocked(sql)
        .mockResolvedValueOnce([
          { id: '1', op_id: 'OP-001', status: 'AGUARDANDO', data_prevista_entrega: null, pecas: 5 },
        ])
        .mockResolvedValueOnce([]);
      const req = mockReq({ method: 'GET', url: '/api/production', query: { id: 'list' } });
      const res = mockRes();
      await handleProduction(req, res);
      expect(res._s()).toBe(200);
    });
  });

  describe('POST detalhes extras', () => {
    it('deve criar OP com data_inicio customizada', async () => {
      vi.mocked(sql).mockResolvedValue([{ id: '1', op_id: 'OP-NEW', produto: 'Mesa' }]);
      const req = mockReq({
        method: 'POST',
        url: '/api/production',
        query: {},
        body: { op_id: 'OP-NEW', produto: 'Mesa', data_inicio: '2026-06-10T08:00:00Z' },
      });
      const res = mockRes();
      await handleProduction(req, res);
      expect(res._s()).toBe(201);
    });
  });
});
