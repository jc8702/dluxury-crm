import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handlePlanoCorte, handleChapas, handleEngenhariaSKUs, handleImportarDesenho } from '../planocorte.js';

// Mock do pdfjs-dist para testar importação de PDF
vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  default: {
    getDocument: vi.fn().mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: vi.fn().mockResolvedValue({
          getTextContent: vi.fn().mockResolvedValue({
            items: [{ str: 'Peça A 800 x 600 x 18' }]
          })
        })
      })
    })
  },
  getDocument: vi.fn().mockReturnValue({
    promise: Promise.resolve({
      numPages: 1,
      getPage: vi.fn().mockResolvedValue({
        getTextContent: vi.fn().mockResolvedValue({
          items: [{ str: 'Peça A 800 x 600 x 18' }]
        })
      })
    })
  })
}));

vi.mock('../drizzle-db.js', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
    execute: vi.fn(),
  }
}));

vi.mock('../_db.js', () => ({
  sql: vi.fn(),
  validateAuth: vi.fn(),
  auditLog: vi.fn(),
}));

const { sql: mockSql, validateAuth } = await import('../_db.js');
const { db } = await import('../drizzle-db.js');

function mockDrizzleChain(resolveValue: any = []) {
  const chain: any = {};
  const methods = ['select', 'from', 'leftJoin', 'innerJoin', 'where', 'limit', 'orderBy', 'update', 'set', 'returning', 'insert', 'values', 'execute'];
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

describe('handlePlanoCorte', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1', tenantId: '00000000-0000-0000-0000-000000000000' }, error: null });
    vi.mocked(mockSql).mockResolvedValue([]);
  });

  it('deve listar planos (GET)', async () => {
    const listChain = mockDrizzleChain([{ id: '1', nome: 'Plano A' }]);
    vi.mocked(db.select).mockReturnValueOnce(listChain);

    const req = { method: 'GET', query: {} };
    const res = mockRes();
    await handlePlanoCorte(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve buscar plano por id (GET ?id=X)', async () => {
    const listChain = mockDrizzleChain([{ id: '1', nome: 'Plano A' }]);
    vi.mocked(db.select).mockReturnValueOnce(listChain);

    const req = { method: 'GET', query: { id: '1' } };
    const res = mockRes();
    await handlePlanoCorte(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve retornar 404 se plano não encontrado', async () => {
    const listChain = mockDrizzleChain([]);
    vi.mocked(db.select).mockReturnValueOnce(listChain);

    const req = { method: 'GET', query: { id: '999' } };
    const res = mockRes();
    await handlePlanoCorte(req, res);
    expect(res._s()).toBe(404);
  });

  it('deve criar plano (POST action=criar_plano)', async () => {
    const insertChain = mockDrizzleChain([{ id: '1', nome: 'Novo Plano' }]);
    vi.mocked(db.insert).mockReturnValueOnce(insertChain);

    const req = { method: 'POST', query: { action: 'criar_plano' }, body: { nome: 'Novo Plano' } };
    const res = mockRes();
    await handlePlanoCorte(req, res);
    expect(res._s()).toBe(201);
  });

  it('deve verificar retalhos duplicados (POST action=verificar_retalhos_duplicados)', async () => {
    vi.mocked(mockSql).mockResolvedValueOnce([{ id: 'ret-1' }]);
    const req = {
      method: 'POST',
      query: { action: 'verificar_retalhos_duplicados' },
      body: { plano_id: '123e4567-e89b-12d3-a456-426614174000', retalhos_gerados: [{ largura_mm: 500, altura_mm: 300 }] }
    };
    const res = mockRes();
    await handlePlanoCorte(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().duplicados).toHaveLength(1);
  });

  it('deve aprovar produção com consumo de estoque e geração de retalho (POST action=aprovar_producao)', async () => {
    // Mock do proximoSkuRetalho (rawSql)
    vi.mocked(mockSql)
      .mockResolvedValueOnce([{ prox: 5 }]) // proximoSkuRetalho
      .mockResolvedValueOnce([{ id: 'mat-1', estoque_atual: 10 }]) // SELECT materiais para consumo de retalho
      .mockResolvedValueOnce([]) // UPDATE materiais retalho
      .mockResolvedValueOnce([]) // INSERT movimentacoes_estoque retalho
      .mockResolvedValueOnce([{ id: 'mat-2', estoque_atual: 5 }]) // SELECT materiais para consumo de chapa
      .mockResolvedValueOnce([]) // UPDATE materiais chapa
      .mockResolvedValueOnce([]) // INSERT movimentacoes_estoque chapa
      .mockResolvedValueOnce([{ preco_custo: '100.00', largura_mm: 2750, altura_mm: 1830 }]) // SELECT chapaInfo de origem do novo retalho
      .mockResolvedValueOnce([{ id: 'new-mat-id' }]) // INSERT novos materiais
      .mockResolvedValueOnce([]) // INSERT movimentacoes_estoque novo retalho
      .mockResolvedValueOnce([]); // INSERT ordens_producao

    // Mocks do Drizzle
    const updateChain = mockDrizzleChain([]);
    vi.mocked(db.update).mockReturnValueOnce(updateChain);

    const insertChain1 = mockDrizzleChain([]);
    const insertChain2 = mockDrizzleChain([]);
    const insertChain3 = mockDrizzleChain([{ id: 'ret-new' }]);
    const insertChain4 = mockDrizzleChain([]);
    vi.mocked(db.insert)
      .mockReturnValueOnce(insertChain1)
      .mockReturnValueOnce(insertChain2)
      .mockReturnValueOnce(insertChain3)
      .mockReturnValueOnce(insertChain4);

    const executeChain = mockDrizzleChain([]);
    vi.mocked(db.execute).mockReturnValueOnce(executeChain);

    const selectChain = mockDrizzleChain([{ id: 'chapa-1' }]);
    vi.mocked(db.select).mockReturnValueOnce(selectChain);

    const req = {
      method: 'POST',
      query: { action: 'aprovar_producao' },
      body: {
        nome_projeto: 'Projeto Teste',
        projeto_id: '123e4567-e89b-12d3-a456-426614174000',
        materiais_consumidos: [
          { id_retalho: '123e4567-e89b-12d3-a456-426614174001', plano_id: '123e4567-e89b-12d3-a456-426614174002', sku: 'CHP-MDF-15' },
          { id_retalho: null, plano_id: '123e4567-e89b-12d3-a456-426614174002', sku: 'CHP-MDF-18', qtd: 2 }
        ],
        retalhos_gerados: [
          { plano_corte_id: '123e4567-e89b-12d3-a456-426614174002', largura_mm: 600, altura_mm: 400, espessura_mm: 15, sku_chapa: 'CHP-MDF-15', quantidade: 1 }
        ]
      }
    };
    const res = mockRes();
    await handlePlanoCorte(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    expect(res._d().data.op_id).toBeDefined();
  });

  it('deve salvar resultado do plano de corte (POST sem action)', async () => {
    const selectChain = mockDrizzleChain([{ id: 'plano-1', nome: 'Plano Existente' }]);
    vi.mocked(db.select).mockReturnValueOnce(selectChain);

    const updateChain = mockDrizzleChain([{ id: 'plano-1', nome: 'Plano Existente', resultado: 'OK' }]);
    vi.mocked(db.update).mockReturnValueOnce(updateChain);

    const req = {
      method: 'POST',
      query: {},
      body: { plano_id: '123e4567-e89b-12d3-a456-426614174000', materiais: [], resultado: 'OK' }
    };
    const res = mockRes();
    await handlePlanoCorte(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().data.resultado).toBe('OK');
  });

  it('deve atualizar plano (PUT)', async () => {
    const updateChain = mockDrizzleChain([{ id: '123e4567-e89b-12d3-a456-426614174000', nome: 'Plano Alterado' }]);
    vi.mocked(db.update).mockReturnValueOnce(updateChain);

    const req = {
      method: 'PUT',
      query: { id: '123e4567-e89b-12d3-a456-426614174000' },
      body: { nome: 'Plano Alterado' }
    };
    const res = mockRes();
    await handlePlanoCorte(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().data.nome).toBe('Plano Alterado');
  });

  it('deve realizar soft delete do plano (DELETE)', async () => {
    const selectChain = mockDrizzleChain([{ id: '123e4567-e89b-12d3-a456-426614174000', nome: 'Plano a Deletar' }]);
    vi.mocked(db.select).mockReturnValueOnce(selectChain);

    const updateChain = mockDrizzleChain([]);
    vi.mocked(db.update).mockReturnValueOnce(updateChain);

    const req = {
      method: 'DELETE',
      query: { id: '123e4567-e89b-12d3-a456-426614174000' }
    };
    const res = mockRes();
    await handlePlanoCorte(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
  });

  it('deve retornar 405 para método não suportado', async () => {
    const req = { method: 'OPTIONS', query: {} };
    const res = mockRes();
    await handlePlanoCorte(req, res);
    expect(res._s()).toBe(405);
  });
});

describe('handleChapas', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1', tenantId: '00000000-0000-0000-0000-000000000000' }, error: null });
    vi.mocked(mockSql).mockResolvedValue([]);
  });

  it('deve listar chapas e mesclar com materiais do estoque', async () => {
    vi.mocked(mockSql).mockResolvedValueOnce([{ id: 'm1', sku: 'CHP-0007', nome: 'MDF 15MM BRANCO TX', largura_mm: '2750', altura_mm: '1830', preco_custo: '230.00' }]);
    
    const selectChain = mockDrizzleChain([{ id: 'e1', sku: 'MDF-BRA-15', nome: 'MDF Branco 15mm', largura_mm: 2750, altura_mm: 1830, espessura_mm: 15, preco_unitario: '280.00', ativo: true }]);
    vi.mocked(db.select).mockReturnValueOnce(selectChain);
    
    const req = { method: 'GET', query: { q: '0007' } };
    const res = mockRes();
    
    await handleChapas(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().data).toBeDefined();
    expect(res._d().data.some((c: any) => c.sku === 'CHP-0007')).toBe(true);
  });
});

describe('handleEngenhariaSKUs', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1', tenantId: '00000000-0000-0000-0000-000000000000' }, error: null });
    vi.mocked(mockSql).mockResolvedValue([]);
  });

  it('deve buscar SKUs de engenharia por termo (GET ?q=X)', async () => {
    const selectChain = mockDrizzleChain([{ id: 'sku-1', codigo: 'MDF-15', nome: 'MDF 15mm' }]);
    vi.mocked(db.select).mockReturnValueOnce(selectChain);

    const req = { method: 'GET', query: { q: 'MDF' } };
    const res = mockRes();
    await handleEngenhariaSKUs(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().data).toHaveLength(1);
  });

  it('deve listar todos SKUs de engenharia (GET sem q)', async () => {
    const selectChain = mockDrizzleChain([{ id: 'sku-1', codigo: 'MDF-15', nome: 'MDF 15mm' }]);
    vi.mocked(db.select).mockReturnValueOnce(selectChain);

    const req = { method: 'GET', query: {} };
    const res = mockRes();
    await handleEngenhariaSKUs(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().data).toHaveLength(1);
  });
});

describe('handleImportarDesenho', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1', tenantId: '00000000-0000-0000-0000-000000000000' }, error: null });
    vi.mocked(mockSql).mockResolvedValue([]);
  });

  it('deve retornar 400 se nenhum arquivo base64 for enviado', async () => {
    const req = { method: 'POST', body: {} };
    const res = mockRes();
    await handleImportarDesenho(req, res);
    expect(res._s()).toBe(400);
  });

  it('deve extrair peças de um arquivo DXF simulado', async () => {
    // DXF simulado contendo códigos de texto
    const dxfContent = `
0
SECTION
2
ENTITIES
0
TEXT
1
Base de Armário
10
0.0
20
0.0
30
0.0
40
18.0
1
800x600x18
0
ENDSEC
    `;
    const dxfBase64 = Buffer.from(dxfContent).toString('base64');
    const req = {
      method: 'POST',
      body: { fileBase64: dxfBase64, fileName: 'projeto.dxf' }
    };
    const res = mockRes();
    await handleImportarDesenho(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    expect(res._d().data.length).toBeGreaterThanOrEqual(1);
    expect(res._d().data[0].largura).toBe(800);
    expect(res._d().data[0].comprimento).toBe(600);
    expect(res._d().data[0].espessura).toBe(18);
  });

  it('deve extrair peças de um arquivo PDF simulado', async () => {
    const pdfBase64 = Buffer.from('PDF_DUMMY_DATA').toString('base64');
    const req = {
      method: 'POST',
      body: { fileBase64: pdfBase64, fileName: 'projeto.pdf' }
    };
    const res = mockRes();
    await handleImportarDesenho(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    expect(res._d().data).toHaveLength(1);
    expect(res._d().data[0].largura).toBe(800);
    expect(res._d().data[0].comprimento).toBe(600);
    expect(res._d().data[0].espessura).toBe(18);
  });

  it('deve extrair peças ordenando largura e comprimento caso comprimento > largura', async () => {
    const dxfContent = `
0
SECTION
2
ENTITIES
0
TEXT
1
Porta Armário
1
600x800x18
0
ENDSEC
    `;
    const dxfBase64 = Buffer.from(dxfContent).toString('base64');
    const req = {
      method: 'POST',
      body: { fileBase64: dxfBase64, fileName: 'projeto_reverso.dxf' }
    };
    const res = mockRes();
    await handleImportarDesenho(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    expect(res._d().data[0].largura).toBe(800);
    expect(res._d().data[0].comprimento).toBe(600);
  });

  it('deve retornar 500 caso ocorra erro ao processar o desenho', async () => {
    const req = {
      method: 'POST',
      body: { fileBase64: Buffer.from('CORRUPT_DATA').toString('base64'), fileName: 'projeto.pdf' }
    };
    const res = mockRes();
    await handleImportarDesenho(req, res);
    expect(res._s()).toBe(500);
    expect(res._d().success).toBe(false);
  });
});
