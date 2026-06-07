import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleCalendario } from '../calendario.js';

vi.mock('../_db.js', () => ({
  sql: vi.fn(),
  validateAuth: vi.fn(),
}));

vi.mock('../middleware/tenantMiddleware.js', () => ({
  withTenant: (handler: any) => handler,
}));

const { sql, validateAuth } = await import('../_db.js');

function mockRes() {
  let sc = 200,
    jd: any = null,
    ended = false;
  const self: any = {
    status: vi.fn((c: number) => {
      sc = c;
      return self;
    }),
    json: vi.fn((d: any) => {
      jd = d;
      return self;
    }),
    end: vi.fn(() => {
      ended = true;
      return self;
    }),
    _s: () => sc,
    _d: () => jd,
  };
  return self;
}

const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000000';
const TEST_USER = { id: 'u1', tenantId: TEST_TENANT_ID, role: 'admin', email: 't@e.com', name: 'Tester' };

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

describe('handleCalendario', () => {
  beforeEach(() => {
    vi.mocked(sql).mockReset();
  });

  describe('GET /eventos', () => {
    it('deve retornar 400 se mes ou ano forem ausentes', async () => {
      const req = mockReq({ method: 'GET', url: '/eventos', query: { mes: '5' } });
      const res = mockRes();
      await handleCalendario(req, res);
      expect(res._s()).toBe(400);
      expect(res._d().error).toBe('Mês e ano são obrigatórios');
    });

    it('deve retornar eventos unificados aplicando filtro_tipo e testando parse de datas complexas da agenda', async () => {
      vi.mocked(sql).mockImplementation(async (query: any) => {
        const qStr = (Array.isArray(query) ? query.join('') : String(query)).replace(/\s+/g, ' ');
        // 1. Eventos manuais
        if (qStr.includes('FROM eventos_calendario')) {
          return [
            {
              id: '1',
              titulo: 'Ev manual',
              descricao: '',
              data_evento: '2026-05-27',
              tipo_evento: 'reuniao',
              cor_categoria: 'purple',
              concluido: false,
            },
          ];
        }
        // 2. Eventos agenda
        if (qStr.includes('FROM eventos e')) {
          return [
            {
              id: '2',
              titulo: 'Visita Cliente A',
              descricao: 'Medição',
              data_inicio: '2026-05-28 14:00:00',
              tipo: 'visita',
              cor: 'red',
              cliente_id: 'c1',
              cliente_nome: 'Roberto',
            },
            {
              id: '3',
              titulo: 'Tarefa Interna',
              descricao: '',
              data_inicio: '2026-05-29T10:00:00.000Z',
              tipo: 'tarefa',
              cor: 'blue',
            },
          ];
        }
        // 3. Ordem prod
        if (qStr.includes('FROM ordens_prod')) {
          return [
            {
              id: '4',
              numero_op: 'OP-123',
              data_prazo: '2026-05-30',
              status: 'concluído',
              cliente_nome: 'Marcos',
            },
          ];
        }
        // 4. Quotations
        if (qStr.includes('FROM quotations')) {
          return [
            {
              id: '5',
              numero_orcamento: 'ORC-002',
              data_orcamento: '2026-05-10',
              prazo_entrega_dias: 20,
              cliente_nome: 'Julio',
            },
          ];
        }
        return [];
      });

      const req = mockReq({
        method: 'GET',
        url: '/eventos',
        query: { mes: '5', ano: '2026', filtro_tipo: 'reuniao' },
      });
      const res = mockRes();
      await handleCalendario(req, res);

      expect(res._s()).toBe(200);
      expect(res._d().success).toBe(true);
      // Pela filtragem por 'reuniao', apenas o manual (tipo_evento='reuniao') e a visita (tipo='visita' mapped to 'reuniao') devem entrar
      expect(res._d().eventos).toHaveLength(2);
      expect(res._d().eventos[0].id).toBe('manual-1');
      expect(res._d().eventos[1].id).toBe('agenda-2');
      expect(res._d().eventos[1].hora_evento).toBe('14:00');
    });
  });

  describe('POST /criar-evento', () => {
    it('deve retornar 400 se titulo, data_evento ou tipo_evento forem ausentes', async () => {
      const req = mockReq({ method: 'POST', url: '/criar-evento', body: { titulo: '' } });
      const res = mockRes();
      await handleCalendario(req, res);
      expect(res._s()).toBe(400);
    });

    it('deve criar evento e sua notificação de calendário associada', async () => {
      vi.mocked(sql)
        .mockResolvedValueOnce([{ id: 100 }]) // INSERT evento
        .mockResolvedValueOnce([]); // INSERT notificacao

      const req = mockReq({
        method: 'POST',
        url: '/criar-evento',
        body: {
          titulo: 'Reunião Técnica',
          data_evento: '2026-06-04',
          tipo_evento: 'reuniao',
          notificacao_dias_antes: 2,
        },
      });
      const res = mockRes();
      await handleCalendario(req, res);

      expect(res._s()).toBe(201);
      expect(res._d().evento.id).toBe(100);
    });
  });

  describe('POST /gerar-automatico', () => {
    it('deve retornar 400 se quotation_id for ausente', async () => {
      const req = mockReq({ method: 'POST', url: '/gerar-automatico', body: {} });
      const res = mockRes();
      await handleCalendario(req, res);
      expect(res._s()).toBe(400);
    });

    it('deve retornar 404 se orçamento não for encontrado', async () => {
      vi.mocked(sql).mockResolvedValueOnce([]); // quotation inexistente
      const req = mockReq({
        method: 'POST',
        url: '/gerar-automatico',
        body: { quotation_id: '00000000-0000-0000-0000-000000000005' },
      });
      const res = mockRes();
      await handleCalendario(req, res);
      expect(res._s()).toBe(404);
    });

    it('deve criar eventos de entrega automáticos para todos os usuários do tenant', async () => {
      vi.mocked(sql)
        .mockResolvedValueOnce([
          {
            id: 'orc-1',
            numero_orcamento: 'ORC-100',
            data_orcamento: '2026-06-01',
            prazo_entrega_dias: '10',
            cliente_nome: 'Marcela',
          },
        ]) // SELECT quotation
        .mockResolvedValueOnce([{ id: 'u1' }, { id: 'u2' }]) // SELECT usuarios
        .mockResolvedValue([]); // INSERT eventos

      const req = mockReq({ method: 'POST', url: '/gerar-automatico', body: { quotation_id: 'orc-uuid' } });
      const res = mockRes();
      await handleCalendario(req, res);

      expect(res._s()).toBe(200);
      expect(res._d().eventos_criados).toBe(2);
    });
  });

  describe('GET /verificar-lembretes', () => {
    it('deve buscar eventos próximos que não foram notificados e criar as notificações de lembrete', async () => {
      vi.mocked(sql)
        .mockResolvedValueOnce([
          {
            id: 10,
            titulo: 'Medição Importante',
            notificacao_dias_antes: 3,
            data_evento: '2026-06-07',
          },
        ]) // SELECT eventosProximos
        .mockResolvedValueOnce([]) // INSERT notificacao
        .mockResolvedValueOnce([]); // UPDATE evento enviado

      const req = mockReq({ method: 'GET', url: '/verificar-lembretes' });
      const res = mockRes();
      await handleCalendario(req, res);

      expect(res._s()).toBe(200);
      expect(res._d().notificacoes_disparadas).toBe(1);
    });
  });

  describe('PATCH / DELETE com ID', () => {
    it('PATCH deve atualizar o evento concluído e retornar 200', async () => {
      vi.mocked(sql).mockResolvedValueOnce([{ id: 1, concluido: true }]);
      const req = mockReq({
        method: 'PATCH',
        query: { id: '1' },
        body: { concluido: true },
      });
      const res = mockRes();
      await handleCalendario(req, res);

      expect(res._s()).toBe(200);
      expect(res._d().data.concluido).toBe(true);
    });

    it('PATCH deve retornar 404 se evento não for encontrado', async () => {
      vi.mocked(sql).mockResolvedValueOnce([]); // não achou
      const req = mockReq({
        method: 'PATCH',
        query: { id: '999' },
        body: { concluido: true },
      });
      const res = mockRes();
      await handleCalendario(req, res);

      expect(res._s()).toBe(404);
    });

    it('DELETE deve excluir o evento e retornar 200', async () => {
      vi.mocked(sql).mockResolvedValueOnce([]);
      const req = mockReq({ method: 'DELETE', query: { id: '1' } });
      const res = mockRes();
      await handleCalendario(req, res);

      expect(res._s()).toBe(200);
      expect(res._d().success).toBe(true);
    });
  });

  describe('POST /criar-evento', () => {
    it('deve criar evento e retornar 201', async () => {
      vi.mocked(sql).mockResolvedValueOnce([{ id: 'novo-1' }]);
      const req = mockReq({
        method: 'POST',
        url: '/criar-evento',
        body: {
          titulo: 'Reunião',
          data_evento: '2026-06-15',
          tipo_evento: 'reuniao',
        },
      });
      const res = mockRes();
      await handleCalendario(req, res);
      expect(res._s()).toBe(201);
      expect(res._d().success).toBe(true);
    });

    it('deve retornar 400 se dados obrigatórios ausentes', async () => {
      const req = mockReq({
        method: 'POST',
        url: '/criar-evento',
        body: { titulo: 'Sem data' },
      });
      const res = mockRes();
      await handleCalendario(req, res);
      expect(res._s()).toBe(400);
    });
  });

  describe('POST /gerar-automatico', () => {
    it('deve gerar eventos automáticos com sucesso', async () => {
      vi.mocked(sql)
        .mockResolvedValueOnce([
          {
            id: 'q1',
            numero_orcamento: 'PRO-001',
            cliente_nome: 'João',
            data_orcamento: '2026-06-01',
            prazo_entrega_dias: '15',
          },
        ])
        .mockResolvedValueOnce([{ id: 'u1' }])
        .mockResolvedValueOnce([{ id: 'auto-1' }]);
      const req = mockReq({ method: 'POST', url: '/gerar-automatico', body: { quotation_id: 'q1' } });
      const res = mockRes();
      await handleCalendario(req, res);
      expect([200, 201]).toContain(res._s());
    });

    it('deve retornar 400 se quotation_id ausente', async () => {
      const req = mockReq({ method: 'POST', url: '/gerar-automatico', body: {} });
      const res = mockRes();
      await handleCalendario(req, res);
      expect(res._s()).toBe(400);
    });

    it('deve retornar 404 se quotation não encontrada', async () => {
      vi.mocked(sql).mockResolvedValueOnce([]);
      const req = mockReq({
        method: 'POST',
        url: '/gerar-automatico',
        body: { quotation_id: 'inexistente' },
      });
      const res = mockRes();
      await handleCalendario(req, res);
      expect(res._s()).toBe(404);
    });
  });

  describe('Auth e edge cases', () => {
    // Auth is now handled by withTenant HOF (see tenantMiddleware.test.ts)
    // The handler no longer performs its own auth checks.
    it.skip('deve retornar 401 sem auth', () => {});
    it.skip('deve usar tenantId default quando user sem tenantId', () => {});
  });

  describe('Erros e Métodos não permitidos', () => {
    it('deve retornar 405 se método for inválido', async () => {
      const req = mockReq({ method: 'OPTIONS' });
      const res = mockRes();
      await handleCalendario(req, res);
      expect(res._s()).toBe(405);
    });

    it('deve retornar 500 em caso de erro fatal de banco', async () => {
      vi.mocked(sql).mockImplementation(async () => {
        throw new Error('Database crash');
      });
      const req = mockReq({ method: 'GET', url: '/eventos', query: { mes: '5', ano: '2026' } });
      const res = mockRes();
      await handleCalendario(req, res);
      expect(res._s()).toBe(500);
    });
  });
});
