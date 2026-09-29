/**
 * Handler de servidor: roda em ambiente `node` (como na Vercel).
 * Importante para o achado A2 — em jsdom existe um `window.status` global que
 * mascararia o `ReferenceError` da variável `status` não declarada.
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleRH } from '../rh.js';

vi.mock('../_db.js', () => ({
  sql: Object.assign(vi.fn(), {
    join: vi.fn((fragments: any[], separator: any) => fragments.join(separator)),
  }),
  validateAuth: vi.fn(),
  extractAndVerifyToken: vi.fn(),
}));

vi.mock('../middleware/tenantMiddleware.js', () => ({
  withTenant: (handler: any) => handler,
}));

const { sql, validateAuth, extractAndVerifyToken } = await import('../_db.js');

const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000000';
const TEST_USER = {
  id: 'u1',
  tenantId: TEST_TENANT_ID,
  role: 'admin',
  email: 't@e.com',
  name: 'Tester',
};

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

function mockReq(overrides: any = {}): any {
  return {
    method: 'GET',
    url: '/api/rh/adiantamentos',
    headers: {},
    body: {},
    query: {},
    tenantId: TEST_TENANT_ID,
    tenantUser: TEST_USER,
    // RH é liberado para planos pro/enterprise (ensureRhFeature)
    planoTier: 'pro',
    ...overrides,
  };
}

describe('handleRH — adiantamentos (achado A2)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(validateAuth).mockReturnValue({
      authorized: true,
      user: { id: 'u1', name: 'Test', tenantId: TEST_TENANT_ID },
      error: null,
    });
    vi.mocked(extractAndVerifyToken).mockReturnValue({
      user: { id: 'u1', name: 'Test' },
      error: null,
    });
    vi.mocked(sql).mockResolvedValue([]);
  });

  /**
   * Regressão do achado A2: a variável `status` era lida mas nunca declarada
   * (`const competencia = req.query?.competencia;` e nada de status), então
   * qualquer GET sem filtros lançava ReferenceError → catch → 500.
   */
  it('deve listar adiantamentos sem filtros (não deve retornar 500)', async () => {
    vi.mocked(sql).mockResolvedValue([
      { id: 'a1', colaborador_nome: 'João', salario_base: '3000.00' },
    ]);
    const req = mockReq({ method: 'GET', query: {} });
    const res = mockRes();

    await handleRH(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    expect(res._d().data).toHaveLength(1);
  });

  it('deve filtrar por competencia (GET ?competencia=X)', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: 'a1' }]);
    const req = mockReq({ method: 'GET', query: { competencia: '2026-08' } });
    const res = mockRes();

    await handleRH(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().data).toHaveLength(1);
  });

  it('deve aceitar o filtro status (GET ?status=pendente)', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: 'a1', status: 'pendente' }]);
    const req = mockReq({ method: 'GET', query: { status: 'pendente' } });
    const res = mockRes();

    await handleRH(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().data).toHaveLength(1);
  });

  it('deve aceitar os dois filtros juntos (GET ?competencia=X&status=Y)', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: 'a1', status: 'pendente' }]);
    const req = mockReq({
      method: 'GET',
      query: { competencia: '2026-08', status: 'pendente' },
    });
    const res = mockRes();

    await handleRH(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().data).toHaveLength(1);
  });

  it('deve retornar 403 para usuário não-admin', async () => {
    const req = mockReq({
      method: 'GET',
      query: {},
      tenantUser: { ...TEST_USER, role: 'vendedor' },
    });
    const res = mockRes();

    await handleRH(req, res);

    expect(res._s()).toBe(403);
  });

  it('deve retornar 405 para método não suportado em adiantamentos', async () => {
    const req = mockReq({ method: 'PUT', query: {} });
    const res = mockRes();

    await handleRH(req, res);

    expect(res._s()).toBe(405);
  });
});
