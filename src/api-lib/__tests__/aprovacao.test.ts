import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleAprovacao } from '../aprovacao.js';

vi.mock('../_db.js', () => ({
  sql: vi.fn(),
  validateAuth: vi.fn(),
}));

vi.mock('../drizzle-db.js', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  }
}));

const { sql, validateAuth } = await import('../_db.js');
const { db } = await import('../drizzle-db.js');

function mockDrizzleChain(resolveValue: any = []) {
  const chain: any = {};
  const methods = ['select', 'from', 'leftJoin', 'innerJoin', 'where', 'limit', 'orderBy', 'update', 'set', 'returning'];
  methods.forEach(method => {
    chain[method] = vi.fn().mockImplementation(() => chain);
  });
  chain.then = vi.fn().mockImplementation((onFulfilled) => {
    return Promise.resolve(resolveValue).then(onFulfilled);
  });
  return chain;
}

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

describe('handleAprovacao', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deve buscar orçamento por token público (GET)', async () => {
    const orcChain = mockDrizzleChain([{ id: '1', numero: 'PRO-001', cliente_nome: 'João' }]);
    const itemsChain = mockDrizzleChain([]);
    vi.mocked(db.select).mockReturnValueOnce(orcChain).mockReturnValueOnce(itemsChain);

    const req = { method: 'GET', query: { token: 'abc-123' } };
    const res = mockRes();
    await handleAprovacao(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().data.numero).toBe('PRO-001');
  });

  it('deve retornar 404 se token inválido', async () => {
    const orcChain = mockDrizzleChain([]);
    vi.mocked(db.select).mockReturnValueOnce(orcChain);

    const req = { method: 'GET', query: { token: 'invalido' } };
    const res = mockRes();
    await handleAprovacao(req, res);
    expect(res._s()).toBe(404);
  });

  it('deve gerar link de aprovação (POST /gerar)', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null });
    const updateChain = mockDrizzleChain([{ id: '1', token_aprovacao: 'new-token', status: 'enviado' }]);
    vi.mocked(db.update).mockReturnValueOnce(updateChain);

    const req = { method: 'POST', url: '/api/aprovacao/gerar', query: {}, body: { quotation_id: '1' }, headers: { origin: 'http://test.com' } };
    const res = mockRes();
    await handleAprovacao(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().data.token_aprovacao).toBe('new-token');
  });

  it('deve aprovar orçamento (POST /aprovar)', async () => {
    const updateChain = mockDrizzleChain([{ id: '1', numero: 'PRO-001' }]);
    vi.mocked(db.update).mockReturnValueOnce(updateChain);

    const req = { method: 'POST', url: '/api/aprovacao/aprovar', query: { token: 'abc' }, body: { nome: 'João' }, headers: { 'x-forwarded-for': '127.0.0.1' } };
    const res = mockRes();
    await handleAprovacao(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve recusar orçamento (POST /recusar)', async () => {
    const updateChain = mockDrizzleChain([]);
    vi.mocked(db.update).mockReturnValueOnce(updateChain);

    const req = { method: 'POST', url: '/api/aprovacao/recusar', query: { token: 'abc' }, body: { motivo: 'Preço alto' } };
    const res = mockRes();
    await handleAprovacao(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve retornar 405 para método não suportado', async () => {
    const req = { method: 'PUT', query: {} };
    const res = mockRes();
    await handleAprovacao(req, res);
    expect(res._s()).toBe(405);
  });

  it('deve retornar 500 em caso de erro interno de banco', async () => {
    vi.mocked(db.select).mockImplementationOnce(() => {
      throw new Error('Database crash');
    });

    const req = { method: 'GET', query: { token: 'abc-123' } };
    const res = mockRes();
    await handleAprovacao(req, res);
    expect(res._s()).toBe(500);
    expect(res._d().error).toBe('Database crash');
  });
});
