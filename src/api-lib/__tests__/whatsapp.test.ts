import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleWhatsApp } from '../whatsapp.js';

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

describe('handleWhatsApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1', tenantId: '00000000-0000-0000-0000-000000000000' }, error: null });
    vi.mocked(sql).mockResolvedValue([{ count: '1' }] as any);
  });

  it('deve retornar 401 se não estiver autorizado', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: false, user: null, error: 'Token inválido' });
    const req = { method: 'GET', url: '/mensagens', query: {}, body: {} };
    const res = mockRes();
    await handleWhatsApp(req, res);
    expect(res._s()).toBe(401);
  });

  it('deve carregar mensagens de uma conversa (GET /mensagens)', async () => {
    vi.mocked(sql).mockImplementation(async (query: any, ...params: any[]) => {
      let qStr = '';
      if (typeof query === 'string') {
        qStr = query;
      } else if (Array.isArray(query)) {
        qStr = query.join('?');
      } else if (query && typeof query === 'object' && 'strings' in query) {
        qStr = (query.strings as string[]).join('?');
      }

      if (qStr.includes('SELECT count(*)') || qStr.includes('modelos_msg_whatsapp')) {
        return [{ count: '1' }];
      }
      if (qStr.includes('mensagens_whatsapp')) {
        return [
          { id: 1, tipo_msg: 'saida', conteudo_msg: 'Olá cliente!', timestamp_msg: new Date().toISOString(), status_entrega: 'lido', arquivo_url: null, usuario_nome: 'Admin' }
        ];
      }
      if (qStr.includes('conversas_whatsapp')) {
        return [{ id: 5, tags: 'orçamento,atendimento', numero_telefone: '+5547999999999', contato_nome: 'Cliente Teste' }];
      }
      return [];
    });

    const req = { method: 'GET', url: '/mensagens', query: { orcamento_id: 'o-uuid' }, body: {} };
    const res = mockRes();
    await handleWhatsApp(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    expect(res._d().mensagens).toHaveLength(1);
    expect(res._d().tags).toContain('orçamento');
    expect(res._d().contato_nome).toBe('Cliente Teste');
  });

  it('deve enviar mensagem no WhatsApp (POST /enviar-mensagem)', async () => {
    vi.mocked(sql).mockImplementation(async (query: any, ...params: any[]) => {
      let qStr = '';
      if (typeof query === 'string') {
        qStr = query;
      } else if (Array.isArray(query)) {
        qStr = query.join('?');
      } else if (query && typeof query === 'object' && 'strings' in query) {
        qStr = (query.strings as string[]).join('?');
      }

      if (qStr.includes('SELECT count(*)')) {
        return [{ count: '1' }];
      }
      if (qStr.includes('SELECT id FROM conversas_whatsapp')) {
        return [{ id: 5 }];
      }
      if (qStr.includes('INSERT INTO mensagens_whatsapp')) {
        return [{ id: 42 }];
      }
      return [];
    });

    const req = {
      method: 'POST',
      url: '/enviar-mensagem',
      query: {},
      body: {
        orcamento_id: 'o-uuid',
        numero_telefone: '+5547999999999',
        conteudo_msg: 'Olá, seu projeto foi aprovado!',
        tags: ['orçamento', 'aprovado']
      }
    };
    const res = mockRes();
    await handleWhatsApp(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    expect(res._d().id).toBe(42);
    expect(res._d().status_entrega).toBe('enviado');
  });

  it('deve carregar modelos de mensagem rápidos (GET /modelos)', async () => {
    vi.mocked(sql).mockImplementation(async (query: any, ...params: any[]) => {
      let qStr = '';
      if (typeof query === 'string') {
        qStr = query;
      } else if (Array.isArray(query)) {
        qStr = query.join('?');
      } else if (query && typeof query === 'object' && 'strings' in query) {
        qStr = (query.strings as string[]).join('?');
      }

      if (qStr.includes('SELECT count(*)')) {
        return [{ count: '1' }];
      }
      if (qStr.includes('SELECT * FROM modelos_msg_whatsapp')) {
        return [
          { id: 1, titulo: 'Modelo Teste', conteudo_template: 'Olá {cliente}', tipo_acionador: 'teste' }
        ];
      }
      return [];
    });

    const req = { method: 'GET', url: '/modelos', query: {}, body: {} };
    const res = mockRes();
    await handleWhatsApp(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    expect(res._d().modelos).toHaveLength(1);
    expect(res._d().modelos[0].titulo).toBe('Modelo Teste');
  });

  it('deve receber resposta simulada do cliente via webhook (POST /webhook)', async () => {
    vi.mocked(sql).mockImplementation(async (query: any, ...params: any[]) => {
      let qStr = '';
      if (typeof query === 'string') {
        qStr = query;
      } else if (Array.isArray(query)) {
        qStr = query.join('?');
      } else if (query && typeof query === 'object' && 'strings' in query) {
        qStr = (query.strings as string[]).join('?');
      }

      if (qStr.includes('SELECT count(*)')) {
        return [{ count: '1' }];
      }
      if (qStr.includes('SELECT id FROM conversas_whatsapp')) {
        return [{ id: 5 }];
      }
      if (qStr.includes('INSERT INTO mensagens_whatsapp')) {
        return [{ id: 43 }];
      }
      return [];
    });

    const req = {
      method: 'POST',
      url: '/webhook',
      query: {},
      body: {
        from_number: '+5547999999999',
        message_text: 'Tudo bem! Pode dar andamento.',
        orcamento_id: 'o-uuid'
      }
    };
    const res = mockRes();
    await handleWhatsApp(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
  });
});
