import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleFinanceiro } from '../financeiro.js';

vi.mock('../_db.js', () => {
  const mockSqlStore = {
    classesRetorno: [] as any[],
    contasRetorno: [] as any[],
    movimentosRetorno: [] as any[],
    titulosReceberRetorno: [] as any[],
    titulosPagarRetorno: [] as any[],
    fechamentosRetorno: [] as any[],
    contasRecorrentesRetorno: [] as any[],
    condicoesRetorno: [] as any[],
    classePermiteLancamento: true,
  };

  const sqlFn: any = vi.fn(async (...args: any[]) => {
    const q = String(args[0]?.[0] || '').toLowerCase();

    // Consultas de infraestrutura (bootstrap/seeds/conferencia check)
    if (q.includes('alter table') || q.includes('insert into audit_logs')) {
      return [];
    }
    if (q.includes('information_schema.columns')) {
      return [{ column_name: 'deletado' }];
    }
    if (q.includes('select count(*)')) {
      return [{ count: '5' }];
    }
    if (q.includes('select now()')) {
      return [{ now: '2026-05-22' }];
    }

    // Verificacao de classe permite lancamento
    if (q.includes('select permite_lancamento from classes_financeiras')) {
      return [{ permite_lancamento: mockSqlStore.classePermiteLancamento }];
    }

    // Verificacao de periodo fechado
    if (q.includes('select id from fechamentos_financeiros where mes =')) {
      return mockSqlStore.fechamentosRetorno;
    }

    // Select especifico de contas_internas
    if (q.includes('select id, nome, saldo_inicial, saldo_atual from contas_internas')) {
      return mockSqlStore.contasRetorno;
    }
    if (q.includes('select saldo_inicial, saldo_atual from contas_internas')) {
      return mockSqlStore.contasRetorno;
    }
    if (q.includes('select id, nome, tipo, banco_codigo, agencia, conta')) {
      return mockSqlStore.contasRetorno;
    }
    if (q.includes('select sum(saldo_atual::numeric) as total from contas_internas')) {
      return [{ total: '15000' }];
    }

    // Select de classes_financeiras
    if (q.includes('select id, codigo, nome, tipo, natureza')) {
      return mockSqlStore.classesRetorno;
    }

    // Select de titulos_receber
    if (q.includes('select id, numero_titulo, cliente_id, projeto_id, quotation_id')) {
      return mockSqlStore.titulosReceberRetorno;
    }

    // Select de titulos_pagar
    if (q.includes('select id, numero_titulo, fornecedor_id, pedido_compra_id')) {
      return mockSqlStore.titulosPagarRetorno;
    }

    if (q.includes('from ( -- baixas de títulos') || q.includes('from ( -- baixas de titulos')) {
      return mockSqlStore.movimentosRetorno;
    }

    // Contas recorrentes
    if (q.includes('select id, descricao, tipo, valor, dia_vencimento')) {
      return mockSqlStore.contasRecorrentesRetorno;
    }

    // Condicoes pagamento
    if (q.includes('from condicoes_pagamento')) {
      return [{ id: '1', nome: '30/60', parcelas: 2 }];
    }

    if (q.includes('update contas_internas set')) {
      mockSqlStore.contasRetorno = [
        { id: '00000000-0000-4000-8000-000000000000', saldo_inicial: 200, saldo_atual: 1100 },
      ];
      return [];
    }

    return [];
  });

  sqlFn.join = vi.fn((values: any[]) => values);

  sqlFn.begin = vi.fn(async (cb: any) => {
    const txFn = vi.fn(async (...args: any[]) => {
      const q = String(args[0]?.[0] || '').toLowerCase();
      if (q.includes('select id, valor_aberto, status, data_vencimento from titulos_receber')) {
        return mockSqlStore.titulosReceberRetorno;
      }
      if (q.includes('select id, valor_aberto, status, conta_bancaria_id')) {
        return mockSqlStore.titulosPagarRetorno;
      }
      if (q.includes('select id, saldo_atual from contas_internas')) {
        return mockSqlStore.contasRetorno;
      }
      if (q.includes('select saldo_atual from contas_internas')) {
        return mockSqlStore.contasRetorno;
      }
      if (
        q.includes(
          'select id, tipo, dia_vencimento, descricao, valor, cliente_id, fornecedor_id, classe_financeira_id, forma_pagamento_id, conta_bancaria_id from contas_recorrentes',
        )
      ) {
        return [
          {
            id: 'cr-1',
            tipo: 'receber',
            dia_vencimento: 10,
            valor: 100,
            descricao: 'Recorrente Teste',
            cliente_id: '00000000-0000-4000-8000-000000000000',
            classe_financeira_id: '00000000-0000-4000-8000-000000000000',
          },
        ];
      }
      if (q.includes('select id from titulos_receber where numero_titulo =')) {
        return [];
      }
      return [];
    });
    return await cb(txFn);
  });

  return { sql: sqlFn, validateAuth: vi.fn(), _mockSqlStore: mockSqlStore };
});

vi.mock('../middleware/tenantMiddleware.js', () => ({
  withTenant: (handler: any) => handler,
}));

const { sql, validateAuth, _mockSqlStore } = (await import('../_db.js')) as any;

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

const mockUuid = '00000000-0000-4000-8000-000000000000';

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

describe('handleFinanceiro router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({
      authorized: true,
      user: { id: 'u1', tenantId: mockUuid },
      error: null,
    });
    _mockSqlStore.classesRetorno = [];
    _mockSqlStore.contasRetorno = [];
    _mockSqlStore.movimentosRetorno = [];
    _mockSqlStore.titulosReceberRetorno = [];
    _mockSqlStore.titulosPagarRetorno = [];
    _mockSqlStore.fechamentosRetorno = [];
    _mockSqlStore.contasRecorrentesRetorno = [];
    _mockSqlStore.condicoesRetorno = [];
    _mockSqlStore.classePermiteLancamento = true;
  });

  it.skip('deve retornar 401 sem autorização', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: false, user: null, error: 'No auth' });
    const req = mockReq({ method: 'GET', url: '/api/financeiro/classes', query: {} });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(401);
  });

  it('deve retornar 404 para recurso inexistente', async () => {
    const req = mockReq({ method: 'GET', url: '/api/financeiro/nao-existe', query: {} });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(404);
  });
});

describe('handleClasses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({
      authorized: true,
      user: { id: 'u1', tenantId: mockUuid },
      error: null,
    });
    _mockSqlStore.classesRetorno = [];
    _mockSqlStore.fechamentosRetorno = [];
    _mockSqlStore.classePermiteLancamento = true;
  });

  it('deve listar classes (GET)', async () => {
    _mockSqlStore.classesRetorno = [{ id: '1', nome: 'Receitas' }];
    const req = mockReq({ method: 'GET', url: '/api/financeiro/classes', query: {} });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve criar classe (POST)', async () => {
    _mockSqlStore.classesRetorno = [{ id: '1', nome: 'Nova Classe' }];
    const req = mockReq({
      method: 'POST',
      url: '/api/financeiro/classes',
      query: {},
      body: { codigo: '1.1', nome: 'Nova Classe', tipo: 'receita', natureza: 'credito' },
    });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(201);
  });

  it('deve atualizar classe (PUT/PATCH)', async () => {
    _mockSqlStore.classesRetorno = [{ id: '1', nome: 'Classe Editada' }];
    const req = mockReq({
      method: 'PUT',
      url: '/api/financeiro/classes/1',
      query: { id: '1' },
      body: { nome: 'Classe Editada' },
    });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve deletar classe (DELETE)', async () => {
    const req = mockReq({ method: 'DELETE', url: '/api/financeiro/classes/1', query: { id: '1' } });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });
});

describe('handleContasInternas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({
      authorized: true,
      user: { id: 'u1', tenantId: mockUuid },
      error: null,
    });
    _mockSqlStore.contasRetorno = [];
    _mockSqlStore.movimentosRetorno = [];
    _mockSqlStore.fechamentosRetorno = [];
  });

  it('deve listar contas (GET)', async () => {
    _mockSqlStore.contasRetorno = [{ id: '1', nome: 'Conta Corrente' }];
    const req = mockReq({ method: 'GET', url: '/api/financeiro/contas-internas', query: {} });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve obter extrato da conta (GET /extrato)', async () => {
    _mockSqlStore.contasRetorno = [
      { id: 'c1', nome: 'Conta Corrente', saldo_inicial: 500, saldo_atual: 1000 },
    ];
    _mockSqlStore.movimentosRetorno = [
      {
        id: 'b1',
        data: '2026-05-01',
        valor: 200,
        tipo: 'recebimento',
        descricao: 'Baixa',
        origem: 'baixa',
      },
      {
        id: 't1',
        data: '2026-05-02',
        valor: 300,
        tipo: 'entrada',
        descricao: 'Tesouraria',
        origem: 'tesouraria',
      },
    ];

    const req = mockReq({
      method: 'GET',
      url: '/api/financeiro/contas-internas/c1/extrato',
      query: { id: 'c1' },
    });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().data.extrato).toBeDefined();
  });

  it('deve criar conta (POST)', async () => {
    _mockSqlStore.contasRetorno = [{ id: '1', nome: 'Nova Conta' }];
    const req = mockReq({
      method: 'POST',
      url: '/api/financeiro/contas-internas',
      query: {},
      body: { nome: 'Nova Conta', tipo: 'corrente' },
    });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(201);
  });

  it('deve atualizar conta sem mexer no saldo inicial (PATCH)', async () => {
    _mockSqlStore.contasRetorno = [{ id: '1', nome: 'Conta Atualizada' }];
    const req = mockReq({
      method: 'PATCH',
      url: '/api/financeiro/contas-internas/1',
      query: { id: '1' },
      body: { nome: 'Conta Atualizada' },
    });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve atualizar conta ajustando saldo inicial (PATCH)', async () => {
    _mockSqlStore.contasRetorno = [
      { id: '00000000-0000-4000-8000-000000000000', saldo_inicial: 100, saldo_atual: 1000 },
    ];

    const req = mockReq({
      method: 'PATCH',
      url: `/api/financeiro/contas-internas/${mockUuid}`,
      query: { id: mockUuid },
      body: { saldo_inicial: 200 },
    });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().data.saldo_atual).toBe(1100);
  });

  it('deve deletar conta (DELETE)', async () => {
    const req = mockReq({
      method: 'DELETE',
      url: '/api/financeiro/contas-internas/1',
      query: { id: '1' },
    });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });
});

describe('handleFormasPagamento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({
      authorized: true,
      user: { id: 'u1', tenantId: mockUuid },
      error: null,
    });
    _mockSqlStore.contasRetorno = [];
  });

  it('deve listar formas de pagamento (GET)', async () => {
    _mockSqlStore.classesRetorno = [{ id: '1', nome: 'Boleto' }];
    const req = mockReq({ method: 'GET', url: '/api/financeiro/formas-pagamento', query: {} });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve criar forma de pagamento (POST)', async () => {
    _mockSqlStore.classesRetorno = [{ id: '1', nome: 'Cartão' }];
    const req = mockReq({
      method: 'POST',
      url: '/api/financeiro/formas-pagamento',
      query: {},
      body: { nome: 'Cartão', tipo: 'credito' },
    });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(201);
  });

  it('deve atualizar forma de pagamento (PATCH)', async () => {
    _mockSqlStore.classesRetorno = [{ id: '1', nome: 'Cartão Master' }];
    const req = mockReq({
      method: 'PATCH',
      url: '/api/financeiro/formas-pagamento/1',
      query: { id: '1' },
      body: { nome: 'Cartão Master' },
    });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve deletar forma de pagamento (DELETE)', async () => {
    const req = mockReq({
      method: 'DELETE',
      url: '/api/financeiro/formas-pagamento/1',
      query: { id: '1' },
    });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });
});

describe('handleTitulosReceber', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({
      authorized: true,
      user: { id: 'u1', tenantId: mockUuid },
      error: null,
    });
    _mockSqlStore.titulosReceberRetorno = [];
    _mockSqlStore.fechamentosRetorno = [];
    _mockSqlStore.contasRetorno = [];
    _mockSqlStore.classePermiteLancamento = true;
  });

  it('deve listar títulos (GET)', async () => {
    _mockSqlStore.titulosReceberRetorno = [
      { id: '1', numero_titulo: 'REC-001', valor_original: 1000 },
    ];
    const req = mockReq({ method: 'GET', url: '/api/financeiro/titulos-receber', query: {} });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve rejeitar POST com body inválido (Zod)', async () => {
    const req = mockReq({
      method: 'POST',
      url: '/api/financeiro/titulos-receber',
      query: {},
      body: { valor_original: -1 },
    });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(400);
  });

  it('deve criar título (POST) com begin mock', async () => {
    _mockSqlStore.titulosReceberRetorno = [{ id: '1', numero_titulo: 'REC-001' }];
    const req = mockReq({
      method: 'POST',
      url: '/api/financeiro/titulos-receber',
      query: {},
      body: {
        valor_original: 1000,
        cliente_id: '123',
        classe_financeira_id: mockUuid,
        data_vencimento: '2026-12-31',
        total_parcelas: 1,
      },
    });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(201);
  });

  it('deve fazer preview de parcelas (POST preview)', async () => {
    const req = mockReq({
      method: 'POST',
      url: '/api/financeiro/titulos-receber/preview',
      query: {},
      body: { valor_original: 1000, total_parcelas: 3, data_vencimento: '2026-12-31' },
    });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().data.parcelas).toHaveLength(3);
  });

  it('deve deletar título individual (DELETE)', async () => {
    const req = mockReq({
      method: 'DELETE',
      url: '/api/financeiro/titulos-receber/id-1',
      query: { id: 'id-1' },
    });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve deletar grupo de títulos (DELETE action=delete_group)', async () => {
    const req = mockReq({
      method: 'DELETE',
      url: '/api/financeiro/titulos-receber',
      query: { action: 'delete_group', cliente_id: '123' },
    });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve fazer a baixa de título a receber com juros e multa (POST baixar)', async () => {
    _mockSqlStore.titulosReceberRetorno = [
      { id: mockUuid, valor_aberto: 1000, status: 'aberto', data_vencimento: '2026-12-31' },
    ];
    _mockSqlStore.contasRetorno = [{ id: mockUuid, saldo_atual: 1000 }];

    const req = mockReq({
      method: 'POST',
      url: `/api/financeiro/titulos-receber/${mockUuid}/baixar`,
      query: { id: mockUuid },
      body: {
        valor_baixa: 1050,
        data_baixa: '2026-12-31',
        conta_interna_id: mockUuid,
        valor_juros: 30,
        valor_multa: 20,
        valor_desconto: 0,
      },
    });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
  });
});

describe('handleTitulosPagar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({
      authorized: true,
      user: { id: 'u1', tenantId: mockUuid },
      error: null,
    });
    _mockSqlStore.titulosPagarRetorno = [];
    _mockSqlStore.contasRetorno = [];
    _mockSqlStore.fechamentosRetorno = [];
    _mockSqlStore.classePermiteLancamento = true;
  });

  it('deve listar títulos (GET)', async () => {
    _mockSqlStore.titulosPagarRetorno = [{ id: '1', numero_titulo: 'PAG-001' }];
    const req = mockReq({ method: 'GET', url: '/api/financeiro/titulos-pagar', query: {} });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve rejeitar POST sem fornecedor_id', async () => {
    const req = mockReq({
      method: 'POST',
      url: '/api/financeiro/titulos-pagar',
      query: {},
      body: { valor_original: 100, classe_financeira_id: mockUuid, data_vencimento: '2026-12-31' },
    });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(400);
  });

  it('deve fazer a baixa de título a pagar (POST baixar)', async () => {
    _mockSqlStore.titulosPagarRetorno = [
      {
        id: mockUuid,
        valor_aberto: 500,
        status: 'aberto',
        conta_bancaria_id: mockUuid,
        data_vencimento: '2026-12-31',
      },
    ];
    _mockSqlStore.contasRetorno = [{ id: mockUuid, saldo_atual: 1000 }];

    const req = mockReq({
      method: 'POST',
      url: `/api/financeiro/titulos-pagar/${mockUuid}/baixar`,
      query: { id: mockUuid },
      body: {
        valor_baixa: 500,
        data_baixa: '2026-12-31',
        conta_interna_id: mockUuid,
        valor_juros: 0,
        valor_multa: 0,
        valor_desconto: 0,
      },
    });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
  });
});

describe('handleTesouraria', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({
      authorized: true,
      user: { id: 'u1', tenantId: mockUuid },
      error: null,
    });
    _mockSqlStore.contasRetorno = [];
    _mockSqlStore.fechamentosRetorno = [];
    _mockSqlStore.classePermiteLancamento = true;
  });

  it('deve listar movimentações (GET)', async () => {
    const req = mockReq({ method: 'GET', url: '/api/financeiro/tesouraria', query: {} });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve rejeitar transferência sem origem/destino', async () => {
    const req = mockReq({
      method: 'POST',
      url: '/api/financeiro/tesouraria?action=transferencia',
      query: { action: 'transferencia' },
      body: {},
    });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(400);
  });

  it('deve realizar transferência com sucesso (POST)', async () => {
    _mockSqlStore.contasRetorno = [
      { id: 'origem-1', saldo_atual: 1000 },
      { id: 'destino-1', saldo_atual: 500 },
    ];

    const req = mockReq({
      method: 'POST',
      url: '/api/financeiro/tesouraria?action=transferencia',
      query: { action: 'transferencia' },
      body: {
        conta_origem_id: 'origem-1',
        conta_destino_id: 'destino-1',
        valor: 300,
        data_movimento: '2026-05-22',
        descricao: 'Transferência de teste',
      },
    });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(201);
    expect(res._d().success).toBe(true);
  });

  it('deve fazer lançamento avulso de entrada (POST lancamento)', async () => {
    _mockSqlStore.contasRetorno = [{ id: 'c1', saldo_atual: 1000 }];

    const req = mockReq({
      method: 'POST',
      url: '/api/financeiro/tesouraria',
      query: { action: 'lancamento' },
      body: {
        tipo: 'entrada',
        conta_interna_id: 'c1',
        valor: 100,
        data_movimento: '2026-05-22',
        classe_financeira_id: mockUuid,
        descricao: 'Entrada avulsa',
      },
    });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(201);
  });
});

describe('handleFechamentos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({
      authorized: true,
      user: { id: 'u1', tenantId: mockUuid },
      error: null,
    });
  });

  it('deve listar fechamentos (GET)', async () => {
    const req = mockReq({ method: 'GET', url: '/api/financeiro/fechamentos', query: {} });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve criar fechamento (POST)', async () => {
    const req = mockReq({
      method: 'POST',
      url: '/api/financeiro/fechamentos',
      query: {},
      body: { mes: 5, ano: 2026, status: 'fechado' },
    });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(201);
  });
});

describe('handleConferencia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({
      authorized: true,
      user: { id: 'u1', tenantId: mockUuid },
      error: null,
    });
  });

  it('deve rejeitar GET na conferência (retorna 405)', async () => {
    const req = mockReq({ method: 'GET', url: '/api/financeiro/conferencia', query: {} });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(405);
  });

  it('deve marcar movimentação/baixa como conferida (POST)', async () => {
    const req = mockReq({
      method: 'POST',
      url: '/api/financeiro/conferencia',
      query: {},
      body: { id: 'mov-1', origem: 'tesouraria', conferido: true },
    });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });
});

describe('handleFluxoCaixa', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({
      authorized: true,
      user: { id: 'u1', tenantId: mockUuid },
      error: null,
    });
    _mockSqlStore.titulosReceberRetorno = [];
    _mockSqlStore.titulosPagarRetorno = [];
  });

  it('deve projetar fluxo de caixa (GET)', async () => {
    const req = mockReq({
      method: 'GET',
      url: '/api/financeiro/fluxo-caixa',
      query: { granularity: 'monthly', periods: '3' },
    });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
  });
});

describe('handleRelatorios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({
      authorized: true,
      user: { id: 'u1', tenantId: mockUuid },
      error: null,
    });
    _mockSqlStore.titulosReceberRetorno = [];
    _mockSqlStore.titulosPagarRetorno = [];
  });

  it('deve obter relatório DRE (GET dre)', async () => {
    const req = mockReq({
      method: 'GET',
      url: '/api/financeiro/relatorios',
      query: { type: 'dre', data_inicio: '2026-01-01', data_fim: '2026-06-30' },
    });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve obter relatório aging (GET aging)', async () => {
    const req = mockReq({
      method: 'GET',
      url: '/api/financeiro/relatorios',
      query: { type: 'aging', modo: 'pagar' },
    });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve obter projeção (GET projetado)', async () => {
    const req = mockReq({
      method: 'GET',
      url: '/api/financeiro/relatorios',
      query: { type: 'projetado', days: '15' },
    });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve obter dashboard (GET dashboard)', async () => {
    const req = mockReq({
      method: 'GET',
      url: '/api/financeiro/relatorios',
      query: { type: 'dashboard' },
    });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve obter capital de giro (GET capital_giro)', async () => {
    const req = mockReq({
      method: 'GET',
      url: '/api/financeiro/relatorios',
      query: { type: 'capital_giro' },
    });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve obter rentabilidade (GET rentabilidade)', async () => {
    const req = mockReq({
      method: 'GET',
      url: '/api/financeiro/relatorios',
      query: { type: 'rentabilidade', data_inicio: '2026-01-01', data_fim: '2026-06-30' },
    });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });
});

describe('handleContasRecorrentes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({
      authorized: true,
      user: { id: 'u1', tenantId: mockUuid },
      error: null,
    });
    _mockSqlStore.contasRecorrentesRetorno = [];
  });

  it('deve listar recorrentes (GET)', async () => {
    _mockSqlStore.contasRecorrentesRetorno = [{ id: '1', descricao: 'Aluguel', valor: 2500 }];
    const req = mockReq({ method: 'GET', url: '/api/financeiro/contas-recorrentes', query: {} });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve criar recorrente (POST)', async () => {
    _mockSqlStore.contasRecorrentesRetorno = [{ id: '1', descricao: 'Aluguel' }];
    const req = mockReq({
      method: 'POST',
      url: '/api/financeiro/contas-recorrentes',
      query: {},
      body: { descricao: 'Aluguel', valor: 2500, dia_vencimento: 10 },
    });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(201);
  });

  it('deve gerar títulos do mês a partir das recorrentes (POST gerar-mes)', async () => {
    const req = mockReq({
      method: 'POST',
      url: '/api/financeiro/contas-recorrentes/gerar-mes',
      query: { mes: '6', ano: '2026' },
    });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(201);
  });

  it('deve atualizar recorrente (PATCH)', async () => {
    const req = mockReq({
      method: 'PATCH',
      url: '/api/financeiro/contas-recorrentes/1',
      query: { id: '1' },
      body: { valor: 2700 },
    });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve deletar recorrente (DELETE)', async () => {
    const req = mockReq({
      method: 'DELETE',
      url: '/api/financeiro/contas-recorrentes/1',
      query: { id: '1' },
    });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });
});

describe('handleCondicoesPagamento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({
      authorized: true,
      user: { id: 'u1', tenantId: mockUuid },
      error: null,
    });
    _mockSqlStore.condicoesRetorno = [];
  });

  it('deve listar condicoes (GET)', async () => {
    _mockSqlStore.condicoesRetorno = [{ id: '1', nome: '30/60/90' }];
    const req = mockReq({ method: 'GET', url: '/api/financeiro/condicoes-pagamento', query: {} });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve criar condicao (POST)', async () => {
    const req = mockReq({
      method: 'POST',
      url: '/api/financeiro/condicoes-pagamento',
      query: {},
      body: { nome: '30/60', parcelas: 2 },
    });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(201);
  });

  it('deve atualizar condicao (PATCH)', async () => {
    const req = mockReq({
      method: 'PATCH',
      url: '/api/financeiro/condicoes-pagamento/1',
      query: { id: '1' },
      body: { nome: '30/60/90/120' },
    });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve deletar condicao (DELETE)', async () => {
    const req = mockReq({
      method: 'DELETE',
      url: '/api/financeiro/condicoes-pagamento/1',
      query: { id: '1' },
    });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });
});

describe('handleDiagnostic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({
      authorized: true,
      user: { id: 'u1', tenantId: mockUuid },
      error: null,
    });
    _mockSqlStore.fechamentosRetorno = [];
  });

  it('deve rodar diagnóstico com sucesso', async () => {
    const req = mockReq({ method: 'GET', url: '/api/financeiro/test', query: {} });
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });
});
