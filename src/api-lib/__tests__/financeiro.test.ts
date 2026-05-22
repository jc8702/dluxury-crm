import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleFinanceiro } from '../financeiro.js';

vi.mock('../_db.js', () => {
  const sqlFn: any = vi.fn(() => Promise.resolve([]));
  sqlFn.begin = vi.fn();
  return { sql: sqlFn, validateAuth: vi.fn() };
});

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

function mockTx() {
  const tx: any = vi.fn(() => Promise.resolve([]));
  return tx;
}

describe('handleFinanceiro router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null });
    vi.mocked(sql).mockImplementation(() => Promise.resolve([]));
  });

  it('deve retornar 401 sem autorização', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: false, user: null, error: 'No auth' });
    const req = { method: 'GET', url: '/api/financeiro/classes', query: {} };
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(401);
  });
});

describe('handleContasInternas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null });
  });

  it('deve listar contas (GET)', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: '1', nome: 'Conta Corrente' }]);
    const req = { method: 'GET', url: '/api/financeiro/contas-internas', query: {} };
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve criar conta (POST)', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: '1', nome: 'Nova Conta' }]);
    const req = { method: 'POST', url: '/api/financeiro/contas-internas', query: {}, body: { nome: 'Nova Conta', tipo: 'corrente' } };
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(201);
  });
});

describe('handleFormasPagamento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null });
  });

  it('deve listar formas de pagamento (GET)', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: '1', nome: 'Boleto' }]);
    const req = { method: 'GET', url: '/api/financeiro/formas-pagamento', query: {} };
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve criar forma de pagamento (POST)', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: '1', nome: 'Cartão' }]);
    const req = { method: 'POST', url: '/api/financeiro/formas-pagamento', query: {}, body: { nome: 'Cartão', tipo: 'credito' } };
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(201);
  });
});

function mockSqlParaCriarTitulo() {
  vi.mocked(sql).mockImplementation((...args: any[]) => {
    const sqlText = String(args[0]?.[0] || '');
    if (sqlText.includes('permite_lancamento')) return Promise.resolve([{ permite_lancamento: true }]);
    if (sqlText.includes('fechamentos_financeiros')) return Promise.resolve([]);
    return Promise.resolve([]);
  });
}

describe('handleTitulosReceber', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null });
  });

  it('deve listar títulos (GET)', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: '1', numero_titulo: 'REC-001', valor_original: 1000 }]);
    const req = { method: 'GET', url: '/api/financeiro/titulos-receber', query: {} };
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve rejeitar POST com body inválido (Zod)', async () => {
    const req = { method: 'POST', url: '/api/financeiro/titulos-receber', query: {}, body: { valor_original: -1 } };
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(400);
  });

  it('deve rejeitar POST sem cliente_id', async () => {
    const req = { method: 'POST', url: '/api/financeiro/titulos-receber', query: {}, body: { valor_original: 100, cliente_id: undefined, classe_financeira_id: '00000000-0000-4000-8000-000000000000', data_vencimento: '2026-12-31' } };
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(400);
  });

  it('deve criar título (POST) com begin mock', async () => {
    const tx = mockTx();
    mockSqlParaCriarTitulo();
    vi.mocked(tx).mockResolvedValue([{ id: '1', numero_titulo: 'REC-001' }]);
    vi.mocked(sql.begin).mockImplementation((cb: any) => cb(tx));
    const req = {
      method: 'POST',
      url: '/api/financeiro/titulos-receber',
      query: {},
      body: {
        valor_original: 1000,
        cliente_id: '123',
        classe_financeira_id: '00000000-0000-4000-8000-000000000000',
        data_vencimento: '2026-12-31',
        total_parcelas: 1,
      },
    };
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(201);
  });

  it('deve fazer preview de parcelas (POST preview)', async () => {
    const req = { method: 'POST', url: '/api/financeiro/titulos-receber/preview', query: {}, body: { valor_original: 1000, total_parcelas: 3, data_vencimento: '2026-12-31' } };
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().data.parcelas).toHaveLength(3);
  });

  it('deve deletar título (DELETE)', async () => {
    const req = { method: 'DELETE', url: '/api/financeiro/titulos-receber/id-1', query: { id: 'id-1' } };
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve rejeitar baixa com body inválido (Zod)', async () => {
    const req = { method: 'POST', url: '/api/financeiro/titulos-receber/id-1/baixar', query: { id: 'id-1' }, body: { valor_baixa: -1 } };
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(400);
  });
});

describe('handleTitulosPagar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null });
  });

  it('deve listar títulos (GET)', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: '1', numero_titulo: 'PAG-001' }]);
    const req = { method: 'GET', url: '/api/financeiro/titulos-pagar', query: {} };
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve rejeitar POST sem fornecedor_id', async () => {
    const req = { method: 'POST', url: '/api/financeiro/titulos-pagar', query: {}, body: { valor_original: 100, classe_financeira_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', data_vencimento: '2026-12-31' } };
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(400);
  });
});

describe('handleTesouraria', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null });
  });

  it('deve listar movimentações (GET)', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: '1', tipo: 'entrada', valor: 500 }]);
    const req = { method: 'GET', url: '/api/financeiro/tesouraria', query: {} };
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve rejeitar transferência sem origem/destino', async () => {
    const req = { method: 'POST', url: '/api/financeiro/tesouraria?action=transferencia', query: { action: 'transferencia' }, body: {} };
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(400);
  });
});

describe('handleFechamentos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null });
  });

  it('deve listar fechamentos (GET)', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: '1', mes: 5, ano: 2026, status: 'fechado' }]);
    const req = { method: 'GET', url: '/api/financeiro/fechamentos', query: {} };
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve criar fechamento (POST)', async () => {
    vi.mocked(sql)
      .mockResolvedValueOnce([]) // SELECT check if exists
      .mockResolvedValueOnce([{ id: '1', mes: 5, ano: 2026, status: 'fechado' }]); // INSERT RETURNING
    const req = { method: 'POST', url: '/api/financeiro/fechamentos', query: {}, body: { mes: 5, ano: 2026, status: 'fechado' } };
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(201);
  });
});

describe('handleCondicoesPagamento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null });
  });

  it('deve listar condições (GET)', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: '1', nome: 'À Vista' }]);
    const req = { method: 'GET', url: '/api/financeiro/condicoes-pagamento', query: {} };
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });
});

describe('handleContasRecorrentes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null });
  });

  it('deve listar contas recorrentes (GET)', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: '1', descricao: 'Aluguel', valor: 2000 }]);
    const req = { method: 'GET', url: '/api/financeiro/contas-recorrentes', query: {} };
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve rejeitar POST sem descricao', async () => {
    const req = { method: 'POST', url: '/api/financeiro/contas-recorrentes', query: {}, body: { valor: 1000 } };
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(400);
  });
});

describe('handleFluxoCaixa', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null });
  });

  it('deve projetar fluxo de caixa (GET)', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: '1', saldo_atual: 10000 }]);
    const req = { method: 'GET', url: '/api/financeiro/fluxo-caixa', query: { granularity: 'monthly', periods: '3' } };
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });
});

describe('handleRelatorios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null });
  });

  it('deve retornar DRE (GET ?type=dre)', async () => {
    vi.mocked(sql).mockResolvedValue([]);
    const req = { method: 'GET', url: '/api/financeiro/relatorios?type=dre&data_inicio=2026-01-01&data_fim=2026-12-31', query: { type: 'dre', data_inicio: '2026-01-01', data_fim: '2026-12-31' } };
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve retornar aging (GET ?type=aging)', async () => {
    vi.mocked(sql).mockResolvedValue([]);
    const req = { method: 'GET', url: '/api/financeiro/relatorios?type=aging', query: { type: 'aging' } };
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve retornar dashboard (GET ?type=dashboard)', async () => {
    vi.mocked(sql).mockResolvedValue([]);
    const req = { method: 'GET', url: '/api/financeiro/relatorios?type=dashboard', query: { type: 'dashboard' } };
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve retornar 404 para relatório sem tipo', async () => {
    const req = { method: 'GET', url: '/api/financeiro/relatorios', query: {} };
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(404);
  });
});

describe('handleDiagnostic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null });
  });

  it('deve rodar diagnóstico (GET test)', async () => {
    vi.mocked(sql)
      .mockResolvedValueOnce([{ now: '2026-05-22' }])
      .mockResolvedValueOnce([{ column_name: 'id' }, { column_name: 'deletado' }])
      .mockResolvedValueOnce([{ column_name: 'id' }, { column_name: 'deletado' }])
      .mockResolvedValueOnce([{ column_name: 'id' }, { column_name: 'deletado' }])
      .mockResolvedValueOnce([{ column_name: 'id' }, { column_name: 'deletado' }])
      .mockResolvedValueOnce([{ column_name: 'id' }, { column_name: 'deletado' }])
      .mockResolvedValueOnce([{ column_name: 'id' }, { column_name: 'deletado' }])
      .mockResolvedValueOnce([{ count: 5 }])
      .mockResolvedValueOnce([]);
    const req = { method: 'GET', url: '/api/financeiro/test', query: {} };
    const res = mockRes();
    await handleFinanceiro(req, res);
    expect(res._s()).toBe(200);
  });
});
