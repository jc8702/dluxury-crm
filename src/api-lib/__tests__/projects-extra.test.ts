import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleProjects,
  handleReports,
  handleEngineering,
  handleSKUs,
  handleSimulations,
} from '../projects.js';

vi.mock('../_db.js', () => ({
  sql: vi.fn(),
  validateAuth: vi.fn(),
  auditLog: vi.fn(),
}));

vi.mock('../_inventory.js', () => ({
  writeOffStockForProject: vi.fn(),
}));

const { sql, validateAuth, auditLog } = await import('../_db.js');
const { writeOffStockForProject } = await import('../_inventory.js');

function mockRes() {
  let sc = 200, jd: any = null;
  const self: any = {
    status: vi.fn((c: number) => { sc = c; return self; }),
    json: vi.fn((d: any) => { jd = d; return self; }),
    end: vi.fn(() => self),
    _s: () => sc, _d: () => jd,
  };
  return self;
}

function makeSql() {
  return vi.mocked(sql).mockImplementation(async (q: any) => {
    const qStr = (Array.isArray(q) ? q.join('') : String(q)).replace(/\s+/g, ' ');
    if (qStr.includes('CREATE TABLE') || qStr.includes('ALTER TABLE')) return [];
    if (qStr.includes('SELECT count(*)')) return [{ count: '0' }];
    return [];
  });
}

beforeEach(() => {
  vi.mocked(sql).mockReset();
  vi.mocked(validateAuth).mockReset();
  vi.mocked(auditLog).mockReset();
  vi.mocked(writeOffStockForProject).mockReset();
  makeSql();
});

describe('handleProjects - 401 e 500', () => {
  it('deve retornar 401 sem auth', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: false, user: null, error: 'Sem token' });
    const req = { method: 'GET', query: {} };
    const res = mockRes();
    await handleProjects(req, res);
    expect(res._s()).toBe(401);
  });

  it('deve retornar 500 em erro de banco', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null });
    vi.mocked(sql).mockImplementation(async () => { throw new Error('DB down'); });
    const req = { method: 'GET', query: {} };
    const res = mockRes();
    await handleProjects(req, res);
    expect(res._s()).toBe(500);
  });
});

describe('handleReports - 401 e 500', () => {
  it('deve retornar 401 sem auth', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: false, user: null, error: 'Sem token' });
    const req = { method: 'GET', query: { type: 'fin-rentabilidade' } };
    const res = mockRes();
    await handleReports(req, res);
    expect(res._s()).toBe(401);
  });

  it('deve retornar 500 em erro de banco', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null });
    vi.mocked(sql).mockImplementation(async () => { throw new Error('DB down'); });
    const req = { method: 'GET', query: { type: 'fin-rentabilidade' } };
    const res = mockRes();
    await handleReports(req, res);
    expect(res._s()).toBe(500);
  });

  it('deve retornar 200 com type=ind-romaneio + projectId', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null });
    vi.mocked(sql).mockResolvedValueOnce([{ ambiente: 'Cozinha', sku_nome: 'MDF' }]);
    const req = { method: 'GET', query: { type: 'ind-romaneio', projectId: 'p1' } };
    const res = mockRes();
    await handleReports(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve retornar 200 com type=com-necessidade', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null });
    vi.mocked(sql).mockResolvedValueOnce([{ sku_code: 'X', nome: 'Y' }]);
    const req = { method: 'GET', query: { type: 'com-necessidade' } };
    const res = mockRes();
    await handleReports(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve retornar 200 com type=ind-desvios', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null });
    vi.mocked(sql).mockResolvedValueOnce([{ id: '1' }]);
    const req = { method: 'GET', query: { type: 'ind-desvios' } };
    const res = mockRes();
    await handleReports(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve usar tenantId default', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null });
    vi.mocked(sql).mockResolvedValueOnce([{ id: '1' }]);
    const req = { method: 'GET', query: { type: 'fin-rentabilidade' } };
    const res = mockRes();
    await handleReports(req, res);
    expect(res._s()).toBe(200);
  });
});

describe('handleEngineering - 401, 500, POST/PUT/DELETE', () => {
  it('deve retornar 401 sem auth', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: false, user: null, error: 'Sem token' });
    const req = { method: 'GET', query: {} };
    const res = mockRes();
    await handleEngineering(req, res);
    expect(res._s()).toBe(401);
  });

  it('deve retornar 500 em erro de banco', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null });
    vi.mocked(sql).mockImplementation(async () => { throw new Error('DB down'); });
    const req = { method: 'GET', query: {} };
    const res = mockRes();
    await handleEngineering(req, res);
    expect(res._s()).toBe(500);
  });

  it('deve aceitar POST', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null });
    vi.mocked(sql).mockResolvedValueOnce([{ id: 'e1' }]);
    const req = { method: 'POST', query: {}, body: { nome: 'Sala', tipo: 'armario' } };
    const res = mockRes();
    await handleEngineering(req, res);
    expect([200, 201]).toContain(res._s());
  });
});

describe('handleSKUs - 401, 500, POST/PUT/DELETE', () => {
  it('deve retornar 401 sem auth', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: false, user: null, error: 'Sem token' });
    const req = { method: 'GET', query: {} };
    const res = mockRes();
    await handleSKUs(req, res);
    expect(res._s()).toBe(401);
  });

  it('deve retornar 500 em erro de banco', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null });
    vi.mocked(sql).mockImplementation(async () => { throw new Error('DB down'); });
    const req = { method: 'GET', query: {} };
    const res = mockRes();
    await handleSKUs(req, res);
    expect(res._s()).toBe(500);
  });

  it('deve aceitar POST', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null });
    vi.mocked(sql).mockResolvedValueOnce([{ id: 'sku1' }]);
    const req = { method: 'POST', query: {}, body: { codigo: 'SKU-1', nome: 'Chapa MDF' } };
    const res = mockRes();
    await handleSKUs(req, res);
    expect([200, 201]).toContain(res._s());
  });
});

describe('handleSimulations - 401, 500, POST/GET/DELETE', () => {
  it('deve retornar 401 sem auth', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: false, user: null, error: 'Sem token' });
    const req = { method: 'GET', query: {} };
    const res = mockRes();
    await handleSimulations(req, res);
    expect(res._s()).toBe(401);
  });

  it('deve retornar 500 em erro de banco', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null });
    vi.mocked(sql).mockImplementation(async () => { throw new Error('DB down'); });
    const req = { method: 'GET', query: {} };
    const res = mockRes();
    await handleSimulations(req, res);
    expect(res._s()).toBe(500);
  });

  it('deve aceitar POST', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null });
    vi.mocked(sql).mockResolvedValueOnce([{ id: 'sim1' }]);
    const req = { method: 'POST', query: {}, body: { nome: 'Simulação 1' } };
    const res = mockRes();
    await handleSimulations(req, res);
    expect([200, 201]).toContain(res._s());
  });
});
