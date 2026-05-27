import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleCalendario } from '../calendario.js';

vi.mock('../_db.js', () => ({
  sql: vi.fn(),
  validateAuth: vi.fn(),
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

describe('handleCalendario', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1', tenantId: '00000000-0000-0000-0000-000000000000' }, error: null });
  });

  it('deve carregar eventos do calendário de forma unificada (GET /eventos)', async () => {
    vi.mocked(sql).mockImplementation(async (query: any, ...params: any[]) => {
      let qStr = '';
      if (typeof query === 'string') {
        qStr = query;
      } else if (Array.isArray(query)) {
        qStr = query.join('?');
      } else if (query && typeof query === 'object' && 'strings' in query) {
        qStr = (query.strings as string[]).join('?');
      }
      if (qStr.includes('eventos_calendario')) {
        // Eventos manuais
        return [{ id: 1, titulo: 'Reunião cliente', data_evento: '2026-05-27', tipo_evento: 'reuniao', cor_categoria: '#8B5CF6', concluido: false }];
      }
      if (qStr.includes('ordens_prod')) {
        // Prazos de OP
        return [{ id: 'op-1', numero_op: 'OP-001', data_prazo: '2026-05-28', status: 'produção', cliente_nome: 'João' }];
      }
      if (qStr.includes('orcamentos_pro')) {
        // Prazos de propostas aprovadas
        return [{ id: 'orc-1', numero_orcamento: 'PRO-001', data_orcamento: '2026-05-15', prazo_entrega_dias: 15, cliente_nome: 'Maria' }];
      }
      return [];
    });

    const req = { method: 'GET', url: '/eventos', query: { mes: '5', ano: '2026' }, body: {} };
    const res = mockRes();

    await handleCalendario(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    // Deve conter os 3 tipos de eventos unificados na lista
    expect(res._d().eventos).toHaveLength(3);
    expect(res._d().eventos[0].id).toBe('manual-1');
    expect(res._d().eventos[1].id).toBe('op-op-1');
    expect(res._d().eventos[2].id).toBe('orcamento-orc-1');
  });

  it('deve criar um evento manual (POST /criar-evento)', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: 100, titulo: 'Nova Tarefa' }] as any);

    const req = {
      method: 'POST',
      url: '/criar-evento',
      query: {},
      body: {
        titulo: 'Nova Tarefa',
        data_evento: '2026-05-27',
        tipo_evento: 'tarefa',
        notificacao_dias_antes: 3
      }
    };
    const res = mockRes();

    await handleCalendario(req, res);

    expect(res._s()).toBe(201);
    expect(res._d().success).toBe(true);
    expect(res._d().evento.id).toBe(100);
  });

  it('deve gerar eventos automáticos na aprovação de orçamento (POST /gerar-automatico)', async () => {
    vi.mocked(sql).mockImplementation(async (query: any, ...params: any[]) => {
      let qStr = '';
      if (typeof query === 'string') {
        qStr = query;
      } else if (Array.isArray(query)) {
        qStr = query.join('?');
      } else if (query && typeof query === 'object' && 'strings' in query) {
        qStr = (query.strings as string[]).join('?');
      }
      if (qStr.includes('FROM orcamentos_pro')) {
        return [{ id: 'orc-uuid', numero_orcamento: 'PRO-001', data_orcamento: '2026-05-27', prazo_entrega_dias: 10 }];
      }
      if (qStr.includes('FROM users')) {
        return [{ id: 'u1' }, { id: 'u2' }]; // Dois usuários no tenant
      }
      return [];
    });

    const req = {
      method: 'POST',
      url: '/gerar-automatico',
      query: {},
      body: { orcamento_id: 'orc-uuid' }
    };
    const res = mockRes();

    await handleCalendario(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    expect(res._d().eventos_criados).toBe(2);
  });

  it('deve verificar lembretes próximos e enviar notificações (GET /verificar-lembretes)', async () => {
    vi.mocked(sql).mockImplementation(async (query: any, ...params: any[]) => {
      let qStr = '';
      if (typeof query === 'string') {
        qStr = query;
      } else if (Array.isArray(query)) {
        qStr = query.join('?');
      } else if (query && typeof query === 'object' && 'strings' in query) {
        qStr = (query.strings as string[]).join('?');
      }
      if (qStr.includes('FROM eventos_calendario')) {
        return [{ id: 50, titulo: 'Lembrete vencendo', notificacao_dias_antes: 2, data_evento: '2026-05-29' }];
      }
      return [];
    });

    const req = { method: 'GET', url: '/verificar-lembretes', query: {}, body: {} };
    const res = mockRes();

    await handleCalendario(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    expect(res._d().notificacoes_disparadas).toBe(1);
  });

  it('deve atualizar status de conclusão do evento (PATCH)', async () => {
    vi.mocked(sql).mockResolvedValue([{ id: 1, concluido: true }] as any);

    const req = {
      method: 'PATCH',
      url: '',
      query: { id: '1' },
      body: { concluido: true }
    };
    const res = mockRes();

    await handleCalendario(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    expect(res._d().data.concluido).toBe(true);
  });

  it('deve excluir um evento (DELETE)', async () => {
    vi.mocked(sql).mockResolvedValue([] as any);

    const req = { method: 'DELETE', url: '', query: { id: '1' }, body: {} };
    const res = mockRes();

    await handleCalendario(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
  });
});
