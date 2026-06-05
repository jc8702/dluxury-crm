import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleProjects, handleReports, handleEngineering, handleSKUs, handleSimulations } from '../projects.js';

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
  let sc = 200, jd: any = null, ended = false;
  const self: any = {
    status: vi.fn((c: number) => { sc = c; return self; }),
    json: vi.fn((d: any) => { jd = d; return self; }),
    end: vi.fn(() => { ended = true; return self; }),
    _s: () => sc, _d: () => jd,
  };
  return self;
}

describe('handleProjects', () => {
  beforeEach(() => {
    vi.mocked(sql).mockReset();
    vi.mocked(validateAuth).mockReset();
    vi.mocked(auditLog).mockReset();
    vi.mocked(writeOffStockForProject).mockReset();

    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1', tenantId: '00000000-0000-0000-0000-000000000000' }, error: null });

    // Configura mock dinâmico do sql para evitar que a infraestrutura consuma mocks de rotas
    vi.mocked(sql).mockImplementation(async (query: any) => {
      const qStr = (Array.isArray(query) ? query.join('') : String(query)).replace(/\s+/g, ' ');

      if (qStr.includes('CREATE TABLE') || qStr.includes('ALTER TABLE')) {
        return [];
      }
      if (qStr.includes('SELECT count(*)')) {
        return [{ count: '0' }];
      }
      if (qStr.includes('SELECT * FROM projects WHERE id =')) {
        return [{ id: '1', ambiente: 'Cozinha', status: 'lead', tenant_id: '00000000-0000-0000-0000-000000000000', tag: 'PRJ-123' }];
      }
      if (qStr.includes('INSERT INTO projects')) {
        return [{ id: '1', ambiente: 'Quarto', status: 'lead' }];
      }
      if (qStr.includes('UPDATE projects')) {
        return [{ id: '1', ambiente: 'Sala Modificada', status: 'lead' }];
      }
      if (qStr.includes('FROM projects')) {
        return [{ id: '1', ambiente: 'Cozinha', status: 'lead' }];
      }
      return [];
    });
  });

  it('deve listar projetos (GET)', async () => {
    const req = { method: 'GET', query: {} };
    const res = mockRes();
    await handleProjects(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().data).toHaveLength(1);
  });

  it('deve buscar projetos por cliente (GET ?client_id=X)', async () => {
    const req = { method: 'GET', query: { client_id: 'c1' } };
    const res = mockRes();
    await handleProjects(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve filtrar projetos por status (GET ?status=X)', async () => {
    const req = { method: 'GET', query: { status: 'lead' } };
    const res = mockRes();
    await handleProjects(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve buscar projetos por termo (GET ?q=X)', async () => {
    const req = { method: 'GET', query: { q: 'Cozinha' } };
    const res = mockRes();
    await handleProjects(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve criar projeto (POST)', async () => {
    const req = { method: 'POST', query: {}, body: { client_id: 'c1', ambiente: 'Quarto' } };
    const res = mockRes();
    await handleProjects(req, res);
    expect(res._s()).toBe(201);
  });

  it('deve criar projeto no status em_producao e disparar criação de OP', async () => {
    vi.mocked(sql).mockImplementation(async (query: any) => {
      const qStr = (Array.isArray(query) ? query.join('') : String(query)).replace(/\s+/g, ' ');
      if (qStr.includes('CREATE TABLE') || qStr.includes('ALTER TABLE')) return [];
      if (qStr.includes('SELECT count(*)')) return [{ count: '1' }];
      if (qStr.includes('INSERT INTO projects')) {
        return [{ id: 'prj-100', status: 'em_producao', ambiente: 'Cozinha', tag: 'PRJ-100' }];
      }
      if (qStr.includes('SELECT id FROM ordens_producao')) {
        return []; // OP não existe ainda
      }
      if (qStr.includes('INSERT INTO ordens_producao')) {
        return [{ id: 'op-1' }];
      }
      return [];
    });

    const req = { method: 'POST', query: {}, body: { client_id: 'c1', ambiente: 'Cozinha', status: 'em_producao' } };
    const res = mockRes();
    await handleProjects(req, res);

    expect(res._s()).toBe(201);
  });

  it('deve atualizar projeto (PUT)', async () => {
    const req = { method: 'PUT', query: { id: '1' }, body: { ambiente: 'Sala Modificada' } };
    const res = mockRes();
    await handleProjects(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve atualizar status de projeto para em_producao (PATCH) e disparar OP', async () => {
    vi.mocked(sql).mockImplementation(async (query: any) => {
      const qStr = (Array.isArray(query) ? query.join('') : String(query)).replace(/\s+/g, ' ');
      if (qStr.includes('CREATE TABLE') || qStr.includes('ALTER TABLE')) return [];
      if (qStr.includes('SELECT count(*)')) return [{ count: '1' }];
      if (qStr.includes('SELECT * FROM projects WHERE id =')) {
        return [{ id: '1', status: 'lead', tag: 'PRJ-123', ambiente: 'Cozinha' }];
      }
      if (qStr.includes('UPDATE projects')) {
        return [{ id: '1', status: 'em_producao', tag: 'PRJ-123', ambiente: 'Cozinha' }];
      }
      if (qStr.includes('SELECT id FROM ordens_producao')) {
        return [];
      }
      if (qStr.includes('INSERT INTO ordens_producao')) {
        return [{ id: 'op-2' }];
      }
      return [];
    });

    const req = { method: 'PATCH', query: { id: '1' }, body: { status: 'em_producao' } };
    const res = mockRes();
    await handleProjects(req, res);

    expect(res._s()).toBe(200);
  });

  it('deve atualizar status de projeto para concluido e dar baixa no estoque', async () => {
    vi.mocked(sql).mockImplementation(async (query: any) => {
      const qStr = (Array.isArray(query) ? query.join('') : String(query)).replace(/\s+/g, ' ');
      if (qStr.includes('CREATE TABLE') || qStr.includes('ALTER TABLE')) return [];
      if (qStr.includes('SELECT count(*)')) return [{ count: '1' }];
      if (qStr.includes('SELECT * FROM projects WHERE id =')) {
        return [{ id: '1', status: 'em_producao', tag: 'PRJ-123', ambiente: 'Cozinha' }];
      }
      if (qStr.includes('UPDATE projects')) {
        return [{ id: '1', status: 'concluido', tag: 'PRJ-123', ambiente: 'Cozinha' }];
      }
      if (qStr.includes('SELECT id FROM erp_project_items')) {
        return [{ id: 'item-1' }];
      }
      return [];
    });

    const req = { method: 'PATCH', query: { id: '1' }, body: { status: 'concluido' } };
    const res = mockRes();
    await handleProjects(req, res);

    expect(res._s()).toBe(200);
    expect(vi.mocked(writeOffStockForProject)).toHaveBeenCalledWith('item-1', '00000000-0000-0000-0000-000000000000');
  });

  it('deve retornar 400 no PUT sem ID', async () => {
    const req = { method: 'PUT', query: {}, body: { ambiente: 'Sala' } };
    const res = mockRes();
    await handleProjects(req, res);
    expect(res._s()).toBe(400);
  });

  it('deve realizar soft delete do projeto (DELETE)', async () => {
    const req = { method: 'DELETE', query: { id: '1' } };
    const res = mockRes();
    await handleProjects(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve retornar 400 no DELETE sem ID', async () => {
    const req = { method: 'DELETE', query: {} };
    const res = mockRes();
    await handleProjects(req, res);
    expect(res._s()).toBe(400);
  });

  it('deve retornar 404 no PATCH se projeto não encontrado', async () => {
    vi.mocked(sql).mockImplementation(async (query: any) => {
      const qStr = (Array.isArray(query) ? query.join('') : String(query)).replace(/\s+/g, ' ');
      if (qStr.includes('SELECT * FROM projects WHERE id =')) {
        return [];
      }
      return [];
    });

    const req = { method: 'PATCH', query: { id: '999' }, body: { status: 'concluido' } };
    const res = mockRes();
    await handleProjects(req, res);
    expect(res._s()).toBe(404);
  });

  it('deve retornar 401 sem autorização', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: false, user: null, error: 'No auth' });
    const req = { method: 'GET', query: {} };
    const res = mockRes();
    await handleProjects(req, res);
    expect(res._s()).toBe(401);
  });

  it('deve executar migração do kanban_items caso projectsCount < kanbanItemsCount', async () => {
    vi.mocked(sql).mockImplementation(async (query: any) => {
      const qStr = (Array.isArray(query) ? query.join('') : String(query)).replace(/\s+/g, ' ');
      if (qStr.includes('CREATE TABLE') || qStr.includes('ALTER TABLE')) return [];
      if (qStr.includes('SELECT count(*) FROM projects')) return [{ count: '2' }];
      if (qStr.includes('SELECT count(*) FROM kanban_items')) return [{ count: '5' }]; // Maior, ativa migração
      if (qStr.includes('INSERT INTO projects')) return [];
      if (qStr.includes('FROM projects')) return [];
      return [];
    });

    const req = { method: 'GET', query: {} };
    const res = mockRes();
    await handleProjects(req, res);
    expect(res._s()).toBe(200);
  });
});

describe('handleReports', () => {
  beforeEach(() => {
    vi.mocked(sql).mockReset();
    vi.mocked(validateAuth).mockReset();
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1', tenantId: '00000000-0000-0000-0000-000000000000' }, error: null });
  });

  it('deve retornar relatorio de rentabilidade (GET ?type=fin-rentabilidade)', async () => {
    vi.mocked(sql).mockResolvedValueOnce([{ id: '1', projeto_id: 'p1', custo_total: 1000 }]);
    const req = { method: 'GET', query: { type: 'fin-rentabilidade' } };
    const res = mockRes();
    await handleReports(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().data).toBeDefined();
  });

  it('deve retornar relatorio de romaneio (GET ?type=ind-romaneio)', async () => {
    vi.mocked(sql).mockResolvedValueOnce([{ ambiente: 'Cozinha', sku_nome: 'Chapa MDF' }]);
    const req = { method: 'GET', query: { type: 'ind-romaneio', projectId: 'p1' } };
    const res = mockRes();
    await handleReports(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve retornar relatorio de necessidade de compra (GET ?type=com-necessidade)', async () => {
    vi.mocked(sql).mockResolvedValueOnce([{ sku_code: 'CHP-1', nome: 'MDF 18mm' }]);
    const req = { method: 'GET', query: { type: 'com-necessidade' } };
    const res = mockRes();
    await handleReports(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve retornar relatorio de desvios (GET ?type=ind-desvios)', async () => {
    vi.mocked(sql).mockResolvedValueOnce([{ id: '1', op_id: 'op-1', tipo_desvio: 'perda' }]);
    const req = { method: 'GET', query: { type: 'ind-desvios' } };
    const res = mockRes();
    await handleReports(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve retornar 400 se tipo inválido', async () => {
    const req = { method: 'GET', query: { type: 'invalido' } };
    const res = mockRes();
    await handleReports(req, res);
    expect(res._s()).toBe(400);
  });
});

describe('handleEngineering', () => {
  beforeEach(() => {
    vi.mocked(sql).mockReset();
    vi.mocked(validateAuth).mockReset();
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1', tenantId: '00000000-0000-0000-0000-000000000000' }, error: null });

    vi.mocked(sql).mockImplementation(async (query: any) => {
      const qStr = (Array.isArray(query) ? query.join('') : String(query)).replace(/\s+/g, ' ');
      if (
        qStr.includes('CREATE TABLE') || 
        qStr.includes('ALTER TABLE') || 
        qStr.includes('ADD CONSTRAINT') || 
        qStr.includes('DO $$')
      ) {
        return [];
      }
      if (qStr.includes('SELECT') && qStr.includes('FROM erp_product_bom')) {
        return [{ id: '1', nome: 'Armario', codigo_modelo: 'MOD-001' }];
      }
      return [];
    });
  });

  it('deve listar modelos de engenharia (GET) sem query', async () => {
    const req = { method: 'GET', query: {} };
    const res = mockRes();
    await handleEngineering(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().data).toHaveLength(1);
  });

  it('deve filtrar modelos de engenharia por termo (GET ?q=X)', async () => {
    const req = { method: 'GET', query: { q: 'Armario' } };
    const res = mockRes();
    await handleEngineering(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().data).toHaveLength(1);
  });

  it('deve retornar 400 no POST se nome for ausente', async () => {
    const req = { method: 'POST', body: { nome: '' } };
    const res = mockRes();
    await handleEngineering(req, res);
    expect(res._s()).toBe(400);
  });

  it('deve cadastrar novo modelo de engenharia auto-gerando codigo_modelo se ausente', async () => {
    vi.mocked(sql).mockImplementation(async (query: any) => {
      const qStr = (Array.isArray(query) ? query.join('') : String(query)).replace(/\s+/g, ' ');
      if (
        qStr.includes('CREATE TABLE') || 
        qStr.includes('ALTER TABLE') || 
        qStr.includes('ADD CONSTRAINT') || 
        qStr.includes('DO $$')
      ) {
        return [];
      }
      if (qStr.includes('SELECT codigo_modelo FROM erp_product_bom')) {
        return [{ codigo_modelo: 'MOD-002' }];
      }
      if (qStr.includes('INSERT INTO erp_product_bom')) {
        return [{ id: 'bom-new', nome: 'Painel MDF' }];
      }
      return [];
    });

    const req = {
      method: 'POST',
      body: {
        nome: 'Painel MDF',
        regras_calculo: [{ valor_unitario: 100, quantidade: 2 }]
      }
    };
    const res = mockRes();
    await handleEngineering(req, res);

    expect(res._s()).toBe(201);
  });

  it('deve atualizar modelo de engenharia (PATCH/PUT)', async () => {
    vi.mocked(sql).mockImplementation(async (query: any) => {
      const qStr = (Array.isArray(query) ? query.join('') : String(query)).replace(/\s+/g, ' ');
      if (
        qStr.includes('CREATE TABLE') || 
        qStr.includes('ALTER TABLE') || 
        qStr.includes('ADD CONSTRAINT') || 
        qStr.includes('DO $$')
      ) {
        return [];
      }
      if (qStr.includes('UPDATE erp_product_bom')) {
        return [{ id: 'bom-1', nome: 'Armario Atualizado' }];
      }
      return [];
    });

    const req = {
      method: 'PATCH',
      query: { id: 'bom-1' },
      body: {
        nome: 'Armario Atualizado',
        regras_calculo: [{ valor_unitario: 150, quantidade: 3 }]
      }
    };
    const res = mockRes();
    await handleEngineering(req, res);

    expect(res._s()).toBe(200);
  });

  it('deve deletar modelo de engenharia (DELETE)', async () => {
    vi.mocked(sql).mockImplementation(async (query: any) => {
      const qStr = (Array.isArray(query) ? query.join('') : String(query)).replace(/\s+/g, ' ');
      if (
        qStr.includes('CREATE TABLE') || 
        qStr.includes('ALTER TABLE') || 
        qStr.includes('ADD CONSTRAINT') || 
        qStr.includes('DO $$')
      ) {
        return [];
      }
      return [];
    });

    const req = { method: 'DELETE', query: { id: 'bom-1' } };
    const res = mockRes();
    await handleEngineering(req, res);
    expect(res._s()).toBe(200);
  });
});

describe('handleSKUs', () => {
  beforeEach(() => {
    vi.mocked(sql).mockReset();
    vi.mocked(validateAuth).mockReset();
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1', tenantId: '00000000-0000-0000-0000-000000000000' }, error: null });
  });

  it('deve gerar proximo codigo SKU quando não existir anterior no banco (GET ?action=next-code)', async () => {
    vi.mocked(sql).mockResolvedValueOnce([]); // sem anterior
    const req = { method: 'GET', query: { action: 'next-code', prefix: 'CHP' } };
    const res = mockRes();
    await handleSKUs(req, res);
    expect(res._s()).toBe(200);
    expect(res._d().data.nextCode).toBe('CHP-0001');
  });

  it('deve criar SKU (POST)', async () => {
    vi.mocked(sql).mockResolvedValueOnce([{ id: '1' }]);
    const req = { method: 'POST', body: { sku_code: 'CHP-0002', nome: 'MDF 6mm', preco_base: 30 } };
    const res = mockRes();
    await handleSKUs(req, res);
    expect(res._s()).toBe(201);
  });

  it('deve atualizar SKU (PATCH/PUT)', async () => {
    vi.mocked(sql).mockResolvedValueOnce([{ id: 'mat-1', nome: 'MDF 6mm Editado' }]);
    const req = { method: 'PATCH', query: { id: 'mat-1' }, body: { nome: 'MDF 6mm Editado' } };
    const res = mockRes();
    await handleSKUs(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve inativar SKU (DELETE)', async () => {
    vi.mocked(sql).mockResolvedValueOnce([]);
    const req = { method: 'DELETE', query: { id: 'mat-1' } };
    const res = mockRes();
    await handleSKUs(req, res);
    expect(res._s()).toBe(200);
  });
});

describe('handleSimulations', () => {
  beforeEach(() => {
    vi.mocked(sql).mockReset();
    vi.mocked(validateAuth).mockReset();
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1', tenantId: '00000000-0000-0000-0000-000000000000' }, error: null });

    vi.mocked(sql).mockImplementation(async (query: any) => {
      const qStr = (Array.isArray(query) ? query.join('') : String(query)).replace(/\s+/g, ' ');
      if (
        qStr.includes('CREATE TABLE') || 
        qStr.includes('ALTER TABLE') || 
        qStr.includes('ADD CONSTRAINT') || 
        qStr.includes('DO $$')
      ) {
        return [];
      }
      if (qStr.includes('SELECT * FROM erp_simulations')) {
        return [{ id: 'sim-123', nome: 'Teste Path' }];
      }
      return [];
    });
  });

  it('deve buscar simulacao extraindo ID do path da URL (GET /simulations/id)', async () => {
    const req = { method: 'GET', url: '/api/simulations/sim-123', query: {} };
    const res = mockRes();
    await handleSimulations(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().data.nome).toBe('Teste Path');
  });

  it('deve atualizar simulação (PUT)', async () => {
    vi.mocked(sql).mockImplementation(async (query: any) => {
      const qStr = (Array.isArray(query) ? query.join('') : String(query)).replace(/\s+/g, ' ');
      if (
        qStr.includes('CREATE TABLE') || 
        qStr.includes('ALTER TABLE') || 
        qStr.includes('ADD CONSTRAINT') || 
        qStr.includes('DO $$')
      ) {
        return [];
      }
      if (qStr.includes('UPDATE erp_simulations')) {
        return [{ id: 'sim-123', nome: 'Simulação Alterada' }];
      }
      return [];
    });

    const req = {
      method: 'PUT',
      query: { id: 'sim-123' },
      body: { nome: 'Simulação Alterada', dados_simulacao: { x: 1 }, dados_input: { y: 2 } }
    };
    const res = mockRes();
    await handleSimulations(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().data.nome).toBe('Simulação Alterada');
  });

  it('deve retornar 404 na atualização (PUT) se não encontrada', async () => {
    vi.mocked(sql).mockImplementation(async (query: any) => {
      const qStr = (Array.isArray(query) ? query.join('') : String(query)).replace(/\s+/g, ' ');
      if (
        qStr.includes('CREATE TABLE') || 
        qStr.includes('ALTER TABLE') || 
        qStr.includes('ADD CONSTRAINT') || 
        qStr.includes('DO $$')
      ) {
        return [];
      }
      if (qStr.includes('UPDATE erp_simulations')) {
        return [];
      }
      return [];
    });

    const req = { method: 'PUT', query: { id: '999' }, body: { nome: 'N/A' } };
    const res = mockRes();
    await handleSimulations(req, res);
    expect(res._s()).toBe(404);
  });
});
