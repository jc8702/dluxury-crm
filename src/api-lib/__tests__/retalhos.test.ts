import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleRetalhos } from '../retalhos.js';
import { db } from '../drizzle-db.js';
import { validateAuth, sql } from '../_db.js';

vi.mock('../_db.js', () => {
  return { 
    sql: vi.fn(), 
    validateAuth: vi.fn() 
  };
});

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
    returning: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
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
  beforeEach(() => { 
    vi.resetAllMocks(); 
    
    // Restaurar implementações padrão de _db.js
    vi.mocked(validateAuth).mockReturnValue({ 
      authorized: true, 
      user: { id: 'u1', name: 'Test User', tenantId: '00000000-0000-0000-0000-000000000000' }, 
      error: null 
    });

    vi.mocked(sql).mockImplementation(async (query: any, ...params: any[]) => {
      let qStr = '';
      if (typeof query === 'string') {
        qStr = query;
      } else if (Array.isArray(query)) {
        qStr = query.join('?');
      } else if (query && typeof query === 'object' && 'strings' in query) {
        qStr = (query.strings as string[]).join('?');
      }

      if (qStr.includes('MAX(CAST(SUBSTRING(sku, 5) AS INTEGER))')) {
        return [{ prox: 5 }];
      }
      if (qStr.includes('INSERT INTO retalhos_estoque')) {
        return [{ id: '1', sku: 'RET-0005', largura_mm: 500 }];
      }
      if (qStr.includes('SELECT id FROM materiais')) {
        return [{ id: 'mat-123' }];
      }
      return [];
    });
    
    // Restaurar implementações padrão encadeáveis do Drizzle
    const mockDb = db as any;
    mockDb.select.mockReturnValue(mockDb);
    mockDb.from.mockReturnValue(mockDb);
    mockDb.where.mockReturnValue(mockDb);
    mockDb.orderBy.mockReturnValue(mockDb);
    mockDb.insert.mockReturnValue(mockDb);
    mockDb.values.mockReturnValue(mockDb);
    mockDb.update.mockReturnValue(mockDb);
    mockDb.set.mockReturnValue(mockDb);
    mockDb.returning.mockReturnValue(mockDb);
    mockDb.delete.mockReturnValue(mockDb);
  });

  it('deve listar retalhos (GET)', async () => {
    const mockDb = db as any;
    mockDb.orderBy.mockResolvedValue([{ id: '1', largura_mm: 500, altura_mm: 300 }]);
    const req = createMockReq();
    const res = mockRes();
    await handleRetalhos(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().data).toHaveLength(1);
  });

  it('deve buscar retalho por id (GET ?id=X)', async () => {
    const mockDb = db as any;
    mockDb.where.mockResolvedValue([{ id: '1', largura_mm: 500 }]);
    const req = createMockReq({ query: { id: '1' } });
    const res = mockRes();
    await handleRetalhos(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve retornar 404 se retalho não encontrado', async () => {
    const mockDb = db as any;
    mockDb.where.mockResolvedValue([]);
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

  it('deve criar novo retalho (POST)', async () => {
    const req = createMockReq({
      method: 'POST',
      body: {
        largura_mm: 500,
        altura_mm: 300,
        espessura_mm: 15,
        sku_chapa: 'CHP-MDF-15',
        origem: 'sobra_corte',
      }
    });
    const res = mockRes();
    await handleRetalhos(req, res);
    expect(res._s()).toBe(201);
    expect(res._d().data.sku).toBe('RET-0005');
  });

  it('deve atualizar retalho para usar (PATCH ?id=X&action=usar)', async () => {
    const mockDb = db as any;
    mockDb.returning.mockResolvedValue([{ id: '1', disponivel: false }]);
    const req = createMockReq({
      method: 'PATCH',
      query: { id: '1', action: 'usar' }
    });
    const res = mockRes();
    await handleRetalhos(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().data.disponivel).toBe(false);
  });

  it('deve atualizar retalho para descartar (PATCH ?id=X&action=descartar)', async () => {
    const mockDb = db as any;
    mockDb.returning.mockResolvedValue([{ id: '1', descartado: true, disponivel: false }]);
    const req = createMockReq({
      method: 'PATCH',
      query: { id: '1', action: 'descartar' }
    });
    const res = mockRes();
    await handleRetalhos(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().data.descartado).toBe(true);
  });

  it('deve atualizar retalho de forma geral (PATCH ?id=X)', async () => {
    const mockDb = db as any;
    mockDb.returning.mockResolvedValue([{ id: '1', localizacao: 'CORREDOR-A' }]);
    const req = createMockReq({
      method: 'PATCH',
      query: { id: '1' },
      body: { localizacao: 'CORREDOR-A' }
    });
    const res = mockRes();
    await handleRetalhos(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().data.localizacao).toBe('CORREDOR-A');
  });

  it('deve retornar 400 no PATCH sem ID', async () => {
    const req = createMockReq({
      method: 'PATCH',
      query: {}
    });
    const res = mockRes();
    await handleRetalhos(req, res);
    expect(res._s()).toBe(400);
  });

  it('deve deletar retalho (DELETE ?id=X)', async () => {
    const mockDb = db as any;
    // Primeiro select retorna o SKU
    mockDb.where.mockResolvedValueOnce([{ sku: 'RET-0005' }]);
    // O delete do retalho resolve com sucesso
    mockDb.where.mockResolvedValueOnce([]);
    const req = createMockReq({
      method: 'DELETE',
      query: { id: '1' }
    });
    const res = mockRes();
    await handleRetalhos(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve retornar 400 no DELETE sem ID', async () => {
    const req = createMockReq({
      method: 'DELETE',
      query: {}
    });
    const res = mockRes();
    await handleRetalhos(req, res);
    expect(res._s()).toBe(400);
  });
});
