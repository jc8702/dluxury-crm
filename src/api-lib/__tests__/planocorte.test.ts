import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handlePlanoCorte } from '../planocorte.js';

vi.mock('../drizzle-db.js', () => {
  const mock = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    execute: vi.fn(),
  };
  return { db: mock };
});

vi.mock('../_db.js', () => ({
  sql: vi.fn(),
  validateAuth: vi.fn(),
  auditLog: vi.fn(),
}));

const { validateAuth } = await import('../_db.js');

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

describe('handlePlanoCorte', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null });
  });

  it('deve listar planos (GET)', async () => {
    const mockDb = (await import('../drizzle-db.js')).db;
    (mockDb as any).where.mockResolvedValue([{ id: '1', nome: 'Plano A' }]);
    const req = { method: 'GET', query: {} };
    const res = mockRes();
    await handlePlanoCorte(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve buscar plano por id (GET ?id=X)', async () => {
    const mockDb = (await import('../drizzle-db.js')).db;
    (mockDb as any).where.mockResolvedValue([{ id: '1', nome: 'Plano A' }]);
    const req = { method: 'GET', query: { id: '1' } };
    const res = mockRes();
    await handlePlanoCorte(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve retornar 404 se plano não encontrado', async () => {
    const mockDb = (await import('../drizzle-db.js')).db;
    (mockDb as any).where.mockResolvedValue([]);
    const req = { method: 'GET', query: { id: '999' } };
    const res = mockRes();
    await handlePlanoCorte(req, res);
    expect(res._s()).toBe(404);
  });

  it('deve criar plano (POST action=criar_plano)', async () => {
    const mockDb = (await import('../drizzle-db.js')).db;
    (mockDb as any).returning.mockResolvedValue([{ id: '1', nome: 'Novo Plano' }]);
    const req = { method: 'POST', query: { action: 'criar_plano' }, body: { nome: 'Novo Plano' } };
    const res = mockRes();
    await handlePlanoCorte(req, res);
    expect(res._s()).toBe(201);
  });

  it('deve retornar 405 para método não suportado', async () => {
    const req = { method: 'OPTIONS', query: {} };
    const res = mockRes();
    await handlePlanoCorte(req, res);
    expect(res._s()).toBe(405);
  });
});
