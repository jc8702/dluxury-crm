import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleWhatsApp } from '../whatsapp.js';

vi.mock('../_db.js', () => ({
  sql: vi.fn(),
  validateAuth: vi.fn(),
}));

// Bypass tenant middleware for unit tests — these tests focus on handler logic, not auth.
// Production auth is exercised in tenantMiddleware.test.ts.
vi.mock('../middleware/tenantMiddleware.js', () => ({
  withTenant: (handler: any) => handler,
}));

const { sql } = await import('../_db.js');

const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000000';
const TEST_USER = { id: 'u1', email: 'u1@x.com', role: 'admin' as const, name: 'Test' };

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

function mockReq(overrides: any = {}) {
  return {
    method: 'GET',
    url: '/',
    query: {},
    body: {},
    tenantId: TEST_TENANT_ID,
    tenantUser: TEST_USER,
    ...overrides,
  };
}

describe('handleWhatsApp', () => {
  beforeEach(() => {
    vi.mocked(sql).mockReset();
    vi.mocked(sql).mockResolvedValue([{ count: '1' }] as any);
  });

  describe('GET /mensagens', () => {
    it('deve retornar 400 se quotation_id e operacao_prod_id forem ausentes', async () => {
      const req = mockReq({ method: 'GET', url: '/mensagens', query: {}, body: {} });
      const res = mockRes();
      await handleWhatsApp(req, res);
      expect(res._s()).toBe(400);
      expect(res._d().error).toBe('Parâmetro quotation_id ou operacao_prod_id é obrigatório');
    });

    it('deve carregar mensagens filtrando por quotation_id', async () => {
      vi.mocked(sql).mockImplementation(async (query: any) => {
        const qStr = (Array.isArray(query) ? query.join('') : String(query)).replace(/\s+/g, ' ');
        if (qStr.includes('SELECT count(*)')) return [{ count: '1' }];
        if (qStr.includes('mensagens_whatsapp') && qStr.includes('c.quotation_id')) {
          return [{ id: 1, tipo_msg: 'saida', conteudo_msg: 'Olá!', timestamp_msg: '2026-06-04' }];
        }
        if (qStr.includes('FROM conversas_whatsapp') && qStr.includes('quotation_id')) {
          return [{ tags: 'tag1', numero_telefone: '123', contato_nome: 'Roberto' }];
        }
        return [];
      });

      const req = mockReq({ method: 'GET', url: '/mensagens', query: { quotation_id: '00000000-0000-0000-0000-000000000001' } });
      const res = mockRes();
      await handleWhatsApp(req, res);

      expect(res._s()).toBe(200);
      expect(res._d().contato_nome).toBe('Roberto');
      expect(res._d().tags).toEqual(['tag1']);
    });

    it('deve carregar mensagens filtrando por operacao_prod_id', async () => {
      vi.mocked(sql).mockImplementation(async (query: any) => {
        const qStr = (Array.isArray(query) ? query.join('') : String(query)).replace(/\s+/g, ' ');
        if (qStr.includes('SELECT count(*)')) return [{ count: '1' }];
        if (qStr.includes('mensagens_whatsapp') && qStr.includes('c.operacao_prod_id')) {
          return [{ id: 1, tipo_msg: 'entrada', conteudo_msg: 'Ok!' }];
        }
        if (qStr.includes('FROM conversas_whatsapp') && qStr.includes('operacao_prod_id')) {
          return [{ tags: '', numero_telefone: '321', contato_nome: 'Marcos' }];
        }
        return [];
      });

      const req = mockReq({ method: 'GET', url: '/mensagens', query: { operacao_prod_id: '00000000-0000-0000-0000-000000000002' } });
      const res = mockRes();
      await handleWhatsApp(req, res);

      expect(res._s()).toBe(200);
      expect(res._d().contato_nome).toBe('Marcos');
      expect(res._d().tags).toEqual([]);
    });
  });

  describe('POST /enviar-mensagem', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('deve retornar 400 se conteudo_msg ou numero_telefone estiverem ausentes', async () => {
      const req = mockReq({ method: 'POST', url: '/enviar-mensagem', body: { conteudo_msg: '' } });
      const res = mockRes();
      await handleWhatsApp(req, res);
      expect(res._s()).toBe(400);
    });

    it('deve enviar e criar conversa associada a quotation_id obtendo nome do cliente', async () => {
      vi.mocked(sql).mockImplementation(async (query: any) => {
        const qStr = (Array.isArray(query) ? query.join('') : String(query)).replace(/\s+/g, ' ');
        if (qStr.includes('SELECT count(*)')) return [{ count: '1' }];
        if (qStr.includes('SELECT id FROM conversas_whatsapp')) return []; // não existe conversa
        if (qStr.includes('SELECT c.nome FROM quotations')) return [{ nome: 'Cliente Q' }]; // nome do cliente
        if (qStr.includes('INSERT INTO conversas_whatsapp')) return [{ id: 10 }]; // nova conversa
        if (qStr.includes('INSERT INTO mensagens_whatsapp')) return [{ id: 100 }]; // nova mensagem
        return [];
      });

      const req = mockReq({
        method: 'POST',
        url: '/enviar-mensagem',
        body: {
          quotation_id: '00000000-0000-0000-0000-000000000001',
          numero_telefone: '12345',
          conteudo_msg: 'Mensagem de teste',
          tags: ['tag1']
        }
      });
      const res = mockRes();
      await handleWhatsApp(req, res);

      expect(res._s()).toBe(200);
      expect(res._d().id).toBe(100);

      // Avança os timers para rodar a simulação assíncrona
      await vi.runAllTimersAsync();
    });

    it('deve enviar e criar conversa associada a operacao_prod_id', async () => {
      vi.mocked(sql).mockImplementation(async (query: any) => {
        const qStr = (Array.isArray(query) ? query.join('') : String(query)).replace(/\s+/g, ' ');
        if (qStr.includes('SELECT count(*)')) return [{ count: '1' }];
        if (qStr.includes('SELECT id FROM conversas_whatsapp')) return []; // não existe conversa
        if (qStr.includes('SELECT c.nome FROM ordens_prod')) return [{ nome: 'Cliente OP' }];
        if (qStr.includes('INSERT INTO conversas_whatsapp')) return [{ id: 11 }];
        if (qStr.includes('INSERT INTO mensagens_whatsapp')) return [{ id: 101 }];
        return [];
      });

      const req = mockReq({
        method: 'POST',
        url: '/enviar-mensagem',
        body: {
          operacao_prod_id: '00000000-0000-0000-0000-000000000002',
          numero_telefone: '12345',
          conteudo_msg: 'Mensagem OP',
          tags: 'string_tag' // teste tags não sendo array
        }
      });
      const res = mockRes();
      await handleWhatsApp(req, res);

      expect(res._s()).toBe(200);
      expect(res._d().id).toBe(101);
      await vi.runAllTimersAsync();
    });

    it('deve enviar usando conversa existente e atualizando-a', async () => {
      vi.mocked(sql).mockImplementation(async (query: any) => {
        const qStr = (Array.isArray(query) ? query.join('') : String(query)).replace(/\s+/g, ' ');
        if (qStr.includes('SELECT count(*)')) return [{ count: '1' }];
        if (qStr.includes('SELECT id FROM conversas_whatsapp')) return [{ id: 5 }]; // conversa existe
        if (qStr.includes('UPDATE conversas_whatsapp')) return [];
        if (qStr.includes('INSERT INTO mensagens_whatsapp')) return [{ id: 102 }];
        return [];
      });

      const req = mockReq({
        method: 'POST',
        url: '/enviar-mensagem',
        body: {
          numero_telefone: '12345',
          conteudo_msg: 'Mensagem em conversa existente'
        }
      });
      const res = mockRes();
      await handleWhatsApp(req, res);

      expect(res._s()).toBe(200);
      expect(res._d().id).toBe(102);
      await vi.runAllTimersAsync();
    });
  });

  describe('GET /modelos', () => {
    it('deve listar modelos cadastrados no banco', async () => {
      vi.mocked(sql).mockImplementation(async (query: any) => {
        const qStr = (Array.isArray(query) ? query.join('') : String(query)).replace(/\s+/g, ' ');
        if (qStr.includes('SELECT count(*)')) return [{ count: '1' }];
        if (qStr.includes('SELECT * FROM modelos_msg_whatsapp')) {
          return [{ id: 'm1', titulo: 'Mod 1', conteudo_template: 'Olá', tipo_acionador: 'medicao' }];
        }
        return [];
      });

      const req = mockReq({ method: 'GET', url: '/modelos' });
      const res = mockRes();
      await handleWhatsApp(req, res);

      expect(res._s()).toBe(200);
      expect(res._d().modelos).toHaveLength(1);
    });
  });

  describe('POST /webhook', () => {
    it('deve retornar 400 se from_number ou message_text estiverem ausentes', async () => {
      const req = mockReq({ method: 'POST', url: '/webhook', body: { message_text: 'Olá' } });
      const res = mockRes();
      await handleWhatsApp(req, res);
      expect(res._s()).toBe(400);
    });

    it('deve processar webhook simulando resposta e criar nova conversa caso não exista', async () => {
      vi.mocked(sql).mockImplementation(async (query: any) => {
        const qStr = (Array.isArray(query) ? query.join('') : String(query)).replace(/\s+/g, ' ');
        if (qStr.includes('SELECT count(*)')) return [{ count: '1' }];
        if (qStr.includes('SELECT id FROM conversas_whatsapp')) return []; // sem conversa
        if (qStr.includes('INSERT INTO conversas_whatsapp')) return [{ id: 20 }];
        if (qStr.includes('INSERT INTO mensagens_whatsapp')) return [{ id: 200, conteudo_msg: 'Msg' }];
        return [];
      });

      const req = mockReq({
        method: 'POST',
        url: '/webhook',
        body: {
          from_number: '12345',
          message_text: 'Simulação cliente respondendo',
          quotation_id: '00000000-0000-0000-0000-000000000001'
        }
      });
      const res = mockRes();
      await handleWhatsApp(req, res);

      expect(res._s()).toBe(200);
      expect(res._d().data.id).toBe(200);
    });

    it('deve processar webhook simulando resposta em conversa existente', async () => {
      vi.mocked(sql).mockImplementation(async (query: any) => {
        const qStr = (Array.isArray(query) ? query.join('') : String(query)).replace(/\s+/g, ' ');
        if (qStr.includes('SELECT count(*)')) return [{ count: '1' }];
        if (qStr.includes('SELECT id FROM conversas_whatsapp')) return [{ id: 20 }]; // conversa existe
        if (qStr.includes('UPDATE conversas_whatsapp')) return [];
        if (qStr.includes('INSERT INTO mensagens_whatsapp')) return [{ id: 201 }];
        return [];
      });

      const req = mockReq({
        method: 'POST',
        url: '/webhook',
        body: {
          from_number: '12345',
          message_text: 'Simulação em conversa existente'
        }
      });
      const res = mockRes();
      await handleWhatsApp(req, res);

      expect(res._s()).toBe(200);
    });
  });

  describe('Modelos Seed & Erros', () => {
    it('deve tolerar falhas no seedDefaultModelos e não quebrar', async () => {
      // 1. SELECT count(*) falha no seed
      vi.mocked(sql).mockRejectedValueOnce(new Error('Tabela modelos_msg_whatsapp não existe'));

      const req = mockReq({ method: 'GET', url: '/modelos' });
      const res = mockRes();

      // Executa. Não deve dar erro porque o seedDefaultModelos faz try-catch silenciando erro
      await handleWhatsApp(req, res);
      expect(res._s()).toBe(200);
    });

    it('deve retornar 405 para métodos não permitidos', async () => {
      const req = mockReq({ method: 'DELETE', url: '/gerar', query: {} });
      const res = mockRes();
      await handleWhatsApp(req, res);
      expect(res._s()).toBe(405);
    });

    it('deve retornar 500 em caso de erro fatal inesperado', async () => {
      vi.mocked(sql).mockImplementation(() => {
        throw new Error('Falha catastrófica');
      });
      const req = mockReq({
        method: 'GET',
        url: '/mensagens',
        query: { quotation_id: '00000000-0000-0000-0000-000000000001' },
      });
      const res = mockRes();
      await handleWhatsApp(req, res);
      expect(res._s()).toBe(500);
    });
  });
});
