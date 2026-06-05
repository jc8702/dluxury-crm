import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleKanbanProducao } from '../kanban-producao.js';

vi.mock('../_db.js', () => ({
  sql: vi.fn(),
  validateAuth: vi.fn(),
  auditLog: vi.fn(),
}));

const { sql, validateAuth } = await import('../_db.js');

function mockRes() {
  let sc = 200, jd: any = null;
  const self: any = {
    status: vi.fn((c: number) => { sc = c; return self; }),
    json: vi.fn((d: any) => { jd = d; return self; }),
    end: vi.fn(() => self),
    _s: () => sc,
    _d: () => jd,
  };
  return self;
}

describe('handleKanbanProducao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1', tenantId: '00000000-0000-0000-0000-000000000000' }, error: null });
  });

  it('deve retornar 401 se não estiver autorizado', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: false, user: null, error: 'Token inválido' });
    const req = { method: 'GET', url: '/board', query: {}, body: {} };
    const res = mockRes();
    await handleKanbanProducao(req, res);
    expect(res._s()).toBe(401);
    expect(res._d().success).toBe(false);
  });

  it('deve carregar o board de kanban e agrupar cards por status (GET /board)', async () => {
    vi.mocked(sql).mockResolvedValue([
      { id: 1, status_kanban: 'a_fazer', etapa_nome: 'MEDIÇÃO', numero_op: 'OP-1' },
      { id: 2, status_kanban: 'em_progresso', etapa_nome: 'PROJETO', numero_op: 'OP-2' },
      { id: 3, status_kanban: 'bloqueado', etapa_nome: 'PRODUÇÃO', numero_op: 'OP-3' },
      { id: 4, status_kanban: 'concluido', etapa_nome: 'ENTREGA', numero_op: 'OP-4' },
    ] as any);

    const req = { method: 'GET', url: '/board', query: {}, body: {} };
    const res = mockRes();
    
    await handleKanbanProducao(req, res);
    
    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    expect(res._d().data.a_fazer).toHaveLength(1);
    expect(res._d().data.em_progresso).toHaveLength(1);
    expect(res._d().data.bloqueado).toHaveLength(1);
    expect(res._d().data.concluido).toHaveLength(1);
  });

  it('deve movimentar um cartão no kanban (POST /move-card)', async () => {
    // Mock do update da etapa
    vi.mocked(sql).mockImplementation(async (query: any, ...params: any[]) => {
      let qStr = '';
      if (typeof query === 'string') {
        qStr = query;
      } else if (Array.isArray(query)) {
        qStr = query.join('?');
      } else if (query && typeof query === 'object' && 'strings' in query) {
        qStr = (query.strings as string[]).join('?');
      }
      
      if (qStr.includes('UPDATE etapas_prod_kanban')) {
        return [{ id: 10, operacao_prod_id: 'op-uuid', status_kanban: 'em_progresso' }];
      }
      if (qStr.includes('SELECT COUNT(*)')) {
        return [{ count: '5', concluidas: '2' }]; // Etapas totais e concluídas
      }
      return [];
    });

    const req = {
      method: 'POST',
      url: '/move-card',
      query: {},
      body: {
        etapa_kanban_id: 10,
        novo_status: 'em_progresso',
        status_anterior: 'a_fazer',
        nota: 'Mover para usinagem'
      }
    };
    const res = mockRes();

    await handleKanbanProducao(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    expect(res._d().data.id).toBe(10);
  });

  it('deve retornar 400 em /move-card se faltar parâmetros', async () => {
    const req = { method: 'POST', url: '/move-card', query: {}, body: { novo_status: 'em_progresso' } };
    const res = mockRes();
    await handleKanbanProducao(req, res);
    expect(res._s()).toBe(400);
  });

  it('deve atualizar os detalhes de um cartão (PATCH /card-details)', async () => {
    vi.mocked(sql).mockImplementation(async (query: any, ...params: any[]) => {
      let qStr = '';
      if (typeof query === 'string') {
        qStr = query;
      } else if (Array.isArray(query)) {
        qStr = query.join('?');
      } else if (query && typeof query === 'object' && 'strings' in query) {
        qStr = (query.strings as string[]).join('?');
      }

      if (qStr.includes('SELECT * FROM etapas_prod_kanban')) {
        return [{ id: 10, responsavel_id: null, status_kanban: 'a_fazer' }];
      }
      if (qStr.includes('SELECT') && qStr.includes('etapas_prod_kanban')) {
        return [{ id: 10, responsavel_id: 'resp-uuid', status_kanban: 'a_fazer' }];
      }
      if (qStr.includes('UPDATE etapas_prod_kanban')) {
        return [{ id: 10, responsavel_id: 'resp-uuid', status_kanban: 'a_fazer' }];
      }
      if (qStr.includes('SELECT m.*')) {
        return [{ id: 1, etapa_kanban_id: 10, nota: 'Nota inserida' }];
      }
      return [];
    });

    const req = {
      method: 'PATCH',
      url: '/card-details',
      query: {},
      body: {
        etapa_kanban_id: 10,
        responsavel_id: 'resp-uuid',
        nota: 'Alteração de responsável'
      }
    };
    const res = mockRes();

    await handleKanbanProducao(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    expect(res._d().data.etapa.responsavel_id).toBe('resp-uuid');
    expect(res._d().data.historico).toHaveLength(1);
  });

  it('deve carregar o histórico do cartão (GET /card-history)', async () => {
    vi.mocked(sql).mockResolvedValue([
      { id: 1, status_anterior: 'a_fazer', status_novo: 'em_progresso', nota: 'Iniciou usinagem' }
    ] as any);

    const req = { method: 'GET', url: '/card-history', query: { id: '10' }, body: {} };
    const res = mockRes();

    await handleKanbanProducao(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    expect(res._d().data).toHaveLength(1);
  });

  it('deve carregar o board aplicando filtros (GET /board)', async () => {
    vi.mocked(sql).mockResolvedValue([]);
    const req = { 
      method: 'GET', 
      url: '/board', 
      query: { 
        filtro_responsavel: '00000000-0000-0000-0000-000000000001', 
        filtro_prioridade: '1', 
        filtro_ambiente: 'Cozinha', 
        busca: 'OP-123' 
      }, 
      body: {} 
    };
    const res = mockRes();
    await handleKanbanProducao(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve retornar 400 no /move-card se status for inválido', async () => {
    const req = { method: 'POST', url: '/move-card', body: { etapa_kanban_id: 10, novo_status: 'invalido' } };
    const res = mockRes();
    await handleKanbanProducao(req, res);
    expect(res._s()).toBe(400);
  });

  it('deve retornar 404 no /move-card se a etapa não for encontrada', async () => {
    vi.mocked(sql).mockResolvedValueOnce([]); // Retorna vazio no update da etapa
    const req = { method: 'POST', url: '/move-card', body: { etapa_kanban_id: 999, novo_status: 'em_progresso' } };
    const res = mockRes();
    await handleKanbanProducao(req, res);
    expect(res._s()).toBe(404);
  });

  it('deve finalizar OP no /move-card se todas as etapas estiverem concluídas', async () => {
    vi.mocked(sql).mockImplementation(async (query: any, ...params: any[]) => {
      let qStr = (Array.isArray(query) ? query.join('?') : String(query)).replace(/\s+/g, ' ');
      if (qStr.includes('UPDATE etapas_prod_kanban')) {
        return [{ id: 10, operacao_prod_id: 'op-123', status_kanban: 'concluido' }];
      }
      if (qStr.includes('INSERT INTO movimento_kanban')) {
        return [];
      }
      if (qStr.includes('SELECT COUNT(*)')) {
        return [{ count: '3', concluidas: '3' }]; // Concluiu todas!
      }
      if (qStr.includes('UPDATE ordens_prod')) {
        return [];
      }
      return [];
    });

    const req = { method: 'POST', url: '/move-card', body: { etapa_kanban_id: 10, novo_status: 'concluido' } };
    const res = mockRes();
    await handleKanbanProducao(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve retornar 400 no PATCH /card-details sem ID', async () => {
    const req = { method: 'PATCH', url: '/card-details', body: {} };
    const res = mockRes();
    await handleKanbanProducao(req, res);
    expect(res._s()).toBe(400);
  });

  it('deve retornar 404 no PATCH /card-details se etapa não encontrada', async () => {
    vi.mocked(sql).mockResolvedValueOnce([]); // select existing empty
    const req = { method: 'PATCH', url: '/card-details', body: { etapa_kanban_id: 999 } };
    const res = mockRes();
    await handleKanbanProducao(req, res);
    expect(res._s()).toBe(404);
  });

  it('deve retornar 400 no GET /card-history sem ID', async () => {
    const req = { method: 'GET', url: '/card-history', query: {} };
    const res = mockRes();
    await handleKanbanProducao(req, res);
    expect(res._s()).toBe(400);
  });

  it('deve retornar 405 para método/rota não suportada', async () => {
    const req = { method: 'DELETE', url: '/board' };
    const res = mockRes();
    await handleKanbanProducao(req, res);
    expect(res._s()).toBe(405);
  });

  it('deve retornar 500 em caso de erro interno de banco', async () => {
    vi.mocked(sql).mockRejectedValue(new Error('Fatal DB crash'));
    const req = { method: 'GET', url: '/board', query: {} };
    const res = mockRes();
    await handleKanbanProducao(req, res);
    expect(res._s()).toBe(500);
  });
});
