import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleRetalhos } from '../retalhos.js';

vi.mock('../drizzle-db.js', () => {
  const mock = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    execute: vi.fn(),
  };
  return { db: mock };
});

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

function createMockReq(overrides = {}) {
  return { method: 'GET', query: {}, body: {}, user: { nome: 'Test' }, ...overrides };
}

describe('handleRetalhos', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deve listar retalhos (GET)', async () => {
    const mockDb = (await import('../drizzle-db.js')).db;
    (mockDb as any).orderBy.mockResolvedValue([{ id: '1', largura_mm: 500, altura_mm: 300 }]);
    const req = createMockReq();
    const res = mockRes();
    await handleRetalhos(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().data).toHaveLength(1);
  });

  it('deve buscar retalho por id (GET ?id=X)', async () => {
    const mockDb = (await import('../drizzle-db.js')).db;
    (mockDb as any).where.mockResolvedValue([{ id: '1', largura_mm: 500 }]);
    const req = createMockReq({ query: { id: '1' } });
    const res = mockRes();
    await handleRetalhos(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve retornar 404 se retalho não encontrado', async () => {
    const mockDb = (await import('../drizzle-db.js')).db;
    (mockDb as any).where.mockResolvedValue([]);
    const req = createMockReq({ query: { id: '999' } });
    const res = mockRes();
    await handleRetalhos(req, res);
    expect(res._s()).toBe(404);
  });

  it('deve retornar 405 para método não suportado', async () => {
    const req = createMockReq({ method: 'PUT' });
    const res = mockRes();
    await handleRetalhos(req, res);
    expect(res._s()).toBe(405);
  });
});
