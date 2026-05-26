import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleAfterSales } from '../after_sales.js';

vi.mock('../_db.js', () => ({ 
  sql: vi.fn(), 
  validateAuth: vi.fn().mockReturnValue({ authorized: true, user: { id: 'u1', name: 'Test', tenantId: '00000000-0000-0000-0000-000000000000' }, error: null }) 
}));

const { sql, validateAuth } = await import('../_db.js');

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

describe('handleAfterSales', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deve listar chamados (GET)', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: '1', numero: 'GAR-2026-001', cliente_nome: 'João' }]);
    const req = { method: 'GET', headers: { host: 'localhost' }, url: '/api/pos-venda' };
    const res = mockRes();
    await handleAfterSales(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().data).toHaveLength(1);
  });

  it('deve retornar stats (GET ?stats=true)', async () => {
    vi.mocked(sql).mockResolvedValue([{ total_abertos: 5, total_resolvidos: 10, tempo_medio: 3.5 }]);
    const req = { method: 'GET', headers: { host: 'localhost' }, url: '/api/pos-venda?stats=true' };
    const res = mockRes();
    await handleAfterSales(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().data.total_abertos).toBe(5);
  });

  it('deve criar chamado (POST)', async () => {
    vi.mocked(sql)
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([{ id: '1', numero: 'GAR-2026-001' }]);
    const req = { method: 'POST', headers: { host: 'localhost' }, url: '/api/pos-venda', body: { cliente_id: '1', titulo: 'Problema', descricao: 'Porta não fecha', tipo: 'defeito', prioridade: 'alta' } };
    const res = mockRes();
    await handleAfterSales(req, res);
    expect(res._s()).toBe(201);
  });

  it('deve atualizar chamado (PATCH)', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: '1', status: 'resolvido' }]);
    const req = { method: 'PATCH', headers: { host: 'localhost' }, url: '/api/pos-venda', body: { id: '1', status: 'resolvido', solucao_aplicada: 'Troca da dobradiça' } };
    const res = mockRes();
    await handleAfterSales(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve retornar 405 para método não suportado', async () => {
    const req = { method: 'DELETE', headers: { host: 'localhost' }, url: '/api/pos-venda' };
    const res = mockRes();
    await handleAfterSales(req, res);
    expect(res._s()).toBe(405);
  });
});
