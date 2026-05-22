import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleOrcamentosPro, explodirBOM, recalcularOrcamento } from '../orcamentos_pro.js';
import { db } from '../drizzle-db.js';
import { validateAuth } from '../_db.js';

// Mock do banco de dados e auxiliares
vi.mock('../drizzle-db.js', () => {
  const mockDb = {
    query: {
      skuEngenharia: {
        findFirst: vi.fn(),
      },
      orcamentos: {
        findFirst: vi.fn(),
      },
      skuComponente: {
        findFirst: vi.fn(),
      },
      orcamentoItens: {
        findFirst: vi.fn(),
      }
    },
    transaction: vi.fn(),
    execute: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
  };
  return { db: mockDb };
});

vi.mock('../_db.js', () => ({
  auditLog: vi.fn().mockResolvedValue({}),
  validateAuth: vi.fn(),
  sql: vi.fn(),
}));

describe('Módulo de Orçamentos PRO', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Retorna um ID aleatório por padrão para que os testes não compartilhem a mesma quota de rate limit
    vi.mocked(validateAuth).mockImplementation(async () => {
      return { user: { id: `test-user-${Math.random()}` } };
    });
  });

  describe('Validação de Rate Limiting', () => {
    it('deve bloquear requisições após o limite de 100 requisições por janela', async () => {
      const rateLimitUser = `rate-limit-user-${Date.now()}`;
      vi.mocked(validateAuth).mockResolvedValue({ user: { id: rateLimitUser } });

      const req = {
        method: 'GET',
        url: '/api/orcamentos?id=some-id',
      };

      let responseStatus = 200;
      let responseData: any = null;

      const res = {
        status: (code: number) => {
          responseStatus = code;
          return res;
        },
        json: (data: any) => {
          responseData = data;
          return res;
        },
      };

      // Simular 100 requisições bem sucedidas
      vi.mocked(db.query.orcamentos.findFirst).mockResolvedValue({ id: 'some-id', itens: [] });

      for (let i = 0; i < 100; i++) {
        await handleOrcamentosPro(req, res);
        expect(responseStatus).toBe(200);
      }

      // A requisição 101 deve ser bloqueada (429)
      await handleOrcamentosPro(req, res);
      expect(responseStatus).toBe(429);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Limite de requisições excedido');
    });
  });

  describe('Validação de Payloads de Entrada (POST / Orcamentos)', () => {
    it('deve retornar 400 ao enviar um payload vazio ou inválido', async () => {
      const req = {
        method: 'POST',
        body: null,
        url: '/api/orcamentos',
      };

      let responseStatus = 200;
      let responseData: any = null;

      const res = {
        status: (code: number) => {
          responseStatus = code;
          return res;
        },
        json: (data: any) => {
          responseData = data;
          return res;
        },
      };

      await handleOrcamentosPro(req, res);

      expect(responseStatus).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Payload inválido');
    });

    it('deve retornar 400 ao enviar itens sem skuEngenhariaId ou que não sejam UUID', async () => {
      const req = {
        method: 'POST',
        url: '/api/orcamentos',
        body: {
          header: { clienteId: '1' },
          itens: [
            { skuEngenhariaId: 'invalid-uuid-format', quantidade: 5 }
          ]
        },
      };

      let responseStatus = 200;
      let responseData: any = null;

      const res = {
        status: (code: number) => {
          responseStatus = code;
          return res;
        },
        json: (data: any) => {
          responseData = data;
          return res;
        },
      };

      await handleOrcamentosPro(req, res);

      expect(responseStatus).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('skuEngenhariaId inválido');
    });

    it('deve retornar 400 ao enviar itens com quantidade negativa ou zero', async () => {
      const req = {
        method: 'POST',
        url: '/api/orcamentos',
        body: {
          header: { clienteId: '1' },
          itens: [
            { skuEngenhariaId: '3bcc2b2c-68cc-48f8-ba20-bafba6b1fca2', quantidade: -2 }
          ]
        },
      };

      let responseStatus = 200;
      let responseData: any = null;

      const res = {
        status: (code: number) => {
          responseStatus = code;
          return res;
        },
        json: (data: any) => {
          responseData = data;
          return res;
        },
      };

      await handleOrcamentosPro(req, res);

      expect(responseStatus).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('quantidade deve ser positiva');
    });
  });

  describe('Explosão de BOM (explodirBOM)', () => {
    it('deve lançar erro caso o skuEngId seja inválido ou vazio', async () => {
      await expect(explodirBOM('not-a-uuid', 1)).rejects.toThrow('SKU inválido');
    });

    it('deve lançar erro caso a quantidade seja negativa', async () => {
      await expect(explodirBOM('3bcc2b2c-68cc-48f8-ba20-bafba6b1fca2', -1)).rejects.toThrow('Quantidade inválida');
    });

    it('deve lançar erro se o SKU de engenharia não existir no banco de dados', async () => {
      vi.mocked(db.query.skuEngenharia.findFirst).mockResolvedValue(null);

      await expect(explodirBOM('3bcc2b2c-68cc-48f8-ba20-bafba6b1fca2', 1)).rejects.toThrow(
        'SKU de Engenharia não encontrado'
      );
    });

    it('deve retornar array vazio se não houver componentes na BOM recursiva', async () => {
      vi.mocked(db.query.skuEngenharia.findFirst).mockResolvedValue({ id: '3bcc2b2c-68cc-48f8-ba20-bafba6b1fca2', nome: 'Test SKU' });
      vi.mocked(db.execute).mockResolvedValue({ rows: [] } as any);

      const result = await explodirBOM('3bcc2b2c-68cc-48f8-ba20-bafba6b1fca2', 1);
      expect(result).toEqual([]);
    });

    it('deve retornar a lista de componentes explodidos calculada corretamente', async () => {
      vi.mocked(db.query.skuEngenharia.findFirst).mockResolvedValue({ id: '3bcc2b2c-68cc-48f8-ba20-bafba6b1fca2', nome: 'Test SKU' });
      vi.mocked(db.execute).mockResolvedValue({
        rows: [
          { sku_componente_id: 'comp-1', quantidade_total: '2.5', nome: 'Componente Teste', codigo: 'COMP001', preco_unitario: '10.00' }
        ]
      } as any);

      const result = await explodirBOM('3bcc2b2c-68cc-48f8-ba20-bafba6b1fca2', 2);
      expect(result).toHaveLength(1);
      expect(result[0].skuComponenteId).toBe('comp-1');
      expect(result[0].quantidadeCalculada).toBe(5.0); // 2.5 * qtdItem (2)
      expect(result[0].custoUnitario).toBe(10.0);
      expect(result[0].custoTotal).toBe(50.0);
    });
  });

  describe('Recalculo de Orcamento (recalcularOrcamento)', () => {
    it('deve falhar se o ID de orçamento for inválido', async () => {
      await expect(recalcularOrcamento('not-uuid')).rejects.toThrow('ID de orçamento inválido');
    });

    it('deve falhar se o orçamento não for encontrado', async () => {
      // Configurar transação mock para executar o callback e retornar findFirst nulo
      const mockTx = {
        query: {
          orcamentos: {
            findFirst: vi.fn().mockResolvedValue(null)
          }
        }
      };
      vi.mocked(db.transaction).mockImplementation(async (callback) => {
        return callback(mockTx as any);
      });

      await expect(recalcularOrcamento('3bcc2b2c-68cc-48f8-ba20-bafba6b1fca2')).rejects.toThrow(
        'Orçamento 3bcc2b2c-68cc-48f8-ba20-bafba6b1fca2 não encontrado'
      );
    });
  });
});
