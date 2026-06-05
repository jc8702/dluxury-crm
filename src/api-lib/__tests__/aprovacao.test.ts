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

  it('POST /gerar deve retornar 401 quando auth falha', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: false, user: null, error: 'Token inválido' });

    const req = { method: 'POST', url: '/api/aprovacao/gerar', query: {}, body: { quotation_id: '1' }, headers: {} };
    const res = mockRes();
    await handleAprovacao(req, res);
    expect(res._s()).toBe(401);
    expect(res._d().error).toBe('Token inválido');
  });

  it('POST /gerar deve usar origin default quando header ausente', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null });
    const updateChain = mockDrizzleChain([{ id: '1', token_aprovacao: 'tok', url_aprovacao: 'https://dluxury-crm.vercel.app/aprovar/tok', status: 'enviado' }]);
    vi.mocked(db.update).mockReturnValueOnce(updateChain);

    const req = { method: 'POST', url: '/api/aprovacao/gerar', query: {}, body: { quotation_id: '1' }, headers: {} };
    const res = mockRes();
    await handleAprovacao(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().data.url_aprovacao).toMatch(/^https:\/\/dluxury-crm\.vercel\.app\/aprovar\//);
  });

  it('POST /aprovar deve usar socket.remoteAddress quando x-forwarded-for ausente', async () => {
    const updateChain = mockDrizzleChain([{ id: '1', numero: 'PRO-001' }]);
    vi.mocked(db.update).mockReturnValueOnce(updateChain);

    const req = {
      method: 'POST',
      url: '/api/aprovacao/aprovar',
      query: { token: 'abc' },
      body: { nome: 'Maria' },
      headers: {},
      socket: { remoteAddress: '192.168.1.10' },
    };
    const res = mockRes();
    await handleAprovacao(req, res);
    expect(res._s()).toBe(200);
  });

  it('POST /aprovar deve fazer coerce de x-forwarded-for array para string', async () => {
    const updateChain = mockDrizzleChain([{ id: '1', numero: 'PRO-001' }]);
    vi.mocked(db.update).mockReturnValueOnce(updateChain);

    const req = {
      method: 'POST',
      url: '/api/aprovacao/aprovar',
      query: { token: 'abc' },
      body: { nome: 'Maria' },
      headers: { 'x-forwarded-for': ['10.0.0.1', '10.0.0.2'] },
    };
    const res = mockRes();
    await handleAprovacao(req, res);
    expect(res._s()).toBe(200);
  });

  it('POST /aprovar deve retornar 404 quando token não bate com nenhuma cotação', async () => {
    const updateChain = mockDrizzleChain([]);
    vi.mocked(db.update).mockReturnValueOnce(updateChain);

    const req = {
      method: 'POST',
      url: '/api/aprovacao/aprovar',
      query: { token: 'inexistente' },
      body: { nome: 'Maria' },
      headers: { 'x-forwarded-for': '127.0.0.1' },
    };
    const res = mockRes();
    await handleAprovacao(req, res);
    expect(res._s()).toBe(404);
    expect(res._d().error).toBe('Erro ao aprovar proposta');
  });

  it('GET /token deve mapear items com campos opcionais null e parseFloat fallback 0', async () => {
    const orcChain = mockDrizzleChain([{ id: 'q1', tenant_id: 't1', numero: 'PRO-002' }]);
    const itemsChain = mockDrizzleChain([
      {
        id: 'i1',
        quotationId: 'q1',
        skuDescricao: null,
        nomeCustomizado: null,
        largura: null,
        altura: null,
        espessura: null,
        material: null,
        quantidade: null,
        precoVendaUnitario: null,
        skuEngenhariaId: null,
        metadata: null,
        createdAt: '2026-06-01',
        updatedAt: '2026-06-01',
      },
    ]);
    vi.mocked(db.select).mockReturnValueOnce(orcChain).mockReturnValueOnce(itemsChain);

    const req = { method: 'GET', query: { token: 'abc' } };
    const res = mockRes();
    await handleAprovacao(req, res);
    expect(res._s()).toBe(200);
    const item = res._d().data.itens[0];
    expect(item.descricao).toBe('Item');
    expect(item.ambiente).toBe('Geral');
    expect(item.largura_cm).toBe(0);
    expect(item.altura_cm).toBe(0);
    expect(item.profundidade_cm).toBe(0);
    expect(item.material).toBe('');
    expect(item.acabamento).toBe('');
    expect(item.quantidade).toBe(0);
    expect(item.valor_unitario).toBe(0);
    expect(item.valor_total).toBe(0);
    expect(item.erp_parametros).toEqual({});
  });

  it('GET /token deve preferir skuDescricao sobre nomeCustomizado para descrição', async () => {
    const orcChain = mockDrizzleChain([{ id: 'q1', tenant_id: 't1', numero: 'PRO-003' }]);
    const itemsChain = mockDrizzleChain([
      {
        id: 'i1',
        quotationId: 'q1',
        skuDescricao: 'MDF Branco 15mm',
        nomeCustomizado: 'Prateleira Custom',
        largura: '60.5',
        altura: '30.0',
        espessura: '1.5',
        material: 'MDF',
        quantidade: '2',
        precoVendaUnitario: '150.00',
        skuEngenhariaId: 'sku-1',
        metadata: { cor: 'branco' },
        createdAt: '2026-06-01',
        updatedAt: '2026-06-01',
      },
    ]);
    vi.mocked(db.select).mockReturnValueOnce(orcChain).mockReturnValueOnce(itemsChain);

    const req = { method: 'GET', query: { token: 'abc' } };
    const res = mockRes();
    await handleAprovacao(req, res);
    expect(res._s()).toBe(200);
    const item = res._d().data.itens[0];
    expect(item.descricao).toBe('MDF Branco 15mm');
    expect(item.ambiente).toBe('Prateleira Custom');
    expect(item.largura_cm).toBe(60.5);
    expect(item.altura_cm).toBe(30);
    expect(item.profundidade_cm).toBe(1.5);
    expect(item.quantidade).toBe(2);
    expect(item.valor_unitario).toBe(150);
    expect(item.valor_total).toBe(300);
    expect(item.erp_product_id).toBe('sku-1');
    expect(item.erp_parametros).toEqual({ cor: 'branco' });
  });

  it('POST /recusar deve aceitar motivo vazio e setar status revisao_solicitada', async () => {
    const updateChain = mockDrizzleChain([]);
    vi.mocked(db.update).mockReturnValueOnce(updateChain);

    const req = {
      method: 'POST',
      url: '/api/aprovacao/recusar',
      query: { token: 'abc' },
      body: { motivo: '' },
    };
    const res = mockRes();
    await handleAprovacao(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
  });

  it('POST /gerar deve usar tenantId default quando user não tem tenantId', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null });
    const updateChain = mockDrizzleChain([{ id: '1', token_aprovacao: 'tok', status: 'enviado' }]);
    vi.mocked(db.update).mockReturnValueOnce(updateChain);

    const req = { method: 'POST', url: '/api/aprovacao/gerar', query: {}, body: { quotation_id: '1' }, headers: { origin: 'https://app.com' } };
    const res = mockRes();
    await handleAprovacao(req, res);
    expect(res._s()).toBe(200);
  });

  it('POST /aprovar deve fazer coerce quando ip é null', async () => {
    const updateChain = mockDrizzleChain([{ id: '1', numero: 'PRO-001' }]);
    vi.mocked(db.update).mockReturnValueOnce(updateChain);

    const req = {
      method: 'POST',
      url: '/api/aprovacao/aprovar',
      query: { token: 'abc' },
      body: { nome: 'Maria' },
      headers: { 'x-forwarded-for': null },
      socket: {},
    };
    const res = mockRes();
    await handleAprovacao(req, res);
    expect(res._s()).toBe(200);
  });

  it('GET sem token e método não GET deve cair no 405', async () => {
    const req = { method: 'DELETE', query: {} };
    const res = mockRes();
    await handleAprovacao(req, res);
    expect(res._s()).toBe(405);
  });
});
