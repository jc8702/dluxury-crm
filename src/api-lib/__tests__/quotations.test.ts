import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleOrcamentosPro, explodirBOM, recalcularOrcamento, _resetRateLimit } from '../quotations.js';
import { db } from '../drizzle-db.js';
import { validateAuth } from '../_db.js';
import { PgDialect } from 'drizzle-orm/pg-core';

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
      quotationItems: {
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
  sql: Object.assign(vi.fn().mockResolvedValue([]), {
    begin: vi.fn().mockImplementation(async (cb) => cb(Object.assign(vi.fn().mockResolvedValue([]), {
      // Mock any transaction methods if needed
    })))
  }),
}));

describe('Módulo de Orçamentos PRO', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetRateLimit();
    // Retorna um ID aleatório por padrão para que os testes não compartilhem a mesma quota de rate limit
    vi.mocked(validateAuth).mockImplementation(() => {
      return { authorized: true, tenantId: '00000000-0000-0000-0000-000000000000', user: { id: `test-user-${Math.random()}` } };
    });
  });

  describe('Validação de Rate Limiting', () => {
    it('deve bloquear requisições após o limite de 100 requisições por janela', async () => {
      const rateLimitUser = `rate-limit-user-${Date.now()}`;
      vi.mocked(validateAuth).mockReturnValue({ authorized: true, tenantId: '00000000-0000-0000-0000-000000000000', user: { id: rateLimitUser } });

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
      const mockTx = {
        execute: vi.fn().mockResolvedValue({ rows: [{ fator_perda_padrao: 0, mo_producao_pct_padrao: 0, mo_instalacao_pct_padrao: 0, aliquota_imposto: 0 }] }),
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

    it('deve recalcular valores considerando taxas operacionais de configuracoes_precificacao', async () => {
      const mockTx = {
        execute: vi.fn().mockResolvedValue({
          rows: [
            {
              fator_perda_padrao: 10,       // 10%
              mo_producao_pct_padrao: 20,   // 20%
              mo_instalacao_pct_padrao: 5,   // 5%
              aliquota_imposto: 15          // 15%
            }
          ]
        }),
        query: {
          orcamentos: {
            findFirst: vi.fn().mockResolvedValue({
              id: '3bcc2b2c-68cc-48f8-ba20-bafba6b1fca2',
              margemLucroPercentual: '30',
              taxaFinanceiraPercentual: '2',
              descontoPercentual: '5',
              itens: [
                {
                  id: 'item-1',
                  quantidade: '2',
                  custoUnitarioCalculado: '100.00',
                  possuiOverride: false,
                  listaExplodida: []
                }
              ]
            })
          }
        },
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis()
      };

      vi.mocked(db.transaction).mockImplementation(async (callback) => {
        return callback(mockTx as any);
      });

      const result = await recalcularOrcamento('3bcc2b2c-68cc-48f8-ba20-bafba6b1fca2');
      expect(result.itensAtualizados).toBe(1);
      // Custo base: 100
      // Custo ajustado: 100 * 1.10 (perda) * 1.20 (fabrica) * 1.05 (instalacao) = 138.60
      // Preço base: 138.60 * 1.30 (margem) = 180.18
      // Preço c/ taxa: 180.18 * 1.02 (taxa financ) = 183.7836
      // Preço final c/ imposto: 183.7836 * 1.15 (imposto) = 211.35114 -> arredondado para 211.35
      // Venda Total (2 itens c/ desconto 5%): (211.35114 * 2) * 0.95 = 401.567 -> 401.57
      expect(result.custoTotal).toBeCloseTo(277.20, 1); // 138.60 * 2
      expect(result.vendaTotal).toBeCloseTo(401.57, 1);
    });
  });

  describe('Aprovação Integrada de Orçamentos', () => {
    const dialect = new PgDialect();
    
    // Helper para extrair SQL do objeto SQL do Drizzle sem quebrar com mocks de transação
    function obterStringSql(query: any): string {
      if (typeof query === 'string') return query;
      if (!query) return '';
      try {
        // sqlToQuery gera a query Postgres parametrizada { sql: string, params: any[] }
        return dialect.sqlToQuery(query).sql;
      } catch (e) {
        // Fallback robusto caso não seja um objeto SQL compilável
        if (query.sql) return query.sql;
        if (Array.isArray(query.queryChunks)) {
          return query.queryChunks.map((chunk: any) => {
            if (typeof chunk === 'string') return chunk;
            if (chunk && typeof chunk === 'object') {
              if (chunk.queryChunks) return obterStringSql(chunk);
              if (Array.isArray(chunk.value)) return chunk.value.join('');
              if (chunk.name) return chunk.name;
            }
            return '';
          }).join('');
        }
        return String(query);
      }
    }

    it('deve realizar fluxo completo de aprovação integrada ao mudar status para APROVADO', async () => {
      const mockTx = {
        execute: vi.fn().mockImplementation(async (query: any) => {
          // Mock dos retornos de select
          const rawSql = obterStringSql(query);

          if (rawSql.includes('FROM condicoes_pagamento')) {
            return { rows: [{ parcelas: 3 }] };
          }
          if (rawSql.includes('FROM classes_financeiras')) {
            return { rows: [{ id: 'class-123' }] };
          }
          if (rawSql.includes('FROM formas_pagamento')) {
            return { rows: [{ id: 'forma-123' }] };
          }
          if (rawSql.includes('FROM materiais')) {
            return { rows: [{ id: 'mat-123', estoque_atual: 10, preco_custo: 50.0 }] };
          }
          return { rows: [] };
        }),
        query: {
          orcamentos: {
            findFirst: vi.fn().mockResolvedValue({
              id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
              numeroOrcamento: 'PRO-2026-0001',
              status: 'RASCUNHO',
              clienteId: 'client-123',
              condicaoPagamentoId: 'cond-123',
              valorTotalVenda: '300.00',
              itens: []
            })
          },
          quotationItems: {
            findMany: vi.fn().mockResolvedValue([
              {
                id: 'item-1',
                skuEngenhariaId: 'sku-eng-123',
                nomeCustomizado: 'Painel Tv',
                quantidade: '1',
                listaExplodida: [
                  {
                    skuComponenteId: 'comp-123',
                    quantidadeCalculada: '2',
                    custoUnitario: '25.00',
                    componente: { codigo: 'CHP-MDF-15', nome: 'MDF 15MM' }
                  }
                ]
              }
            ])
          }
        },
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis()
      };

      vi.mocked(db.transaction).mockImplementation(async (callback) => {
        return callback(mockTx as any);
      });

      // Mock do findFirst da checagem externa de exists
      vi.mocked(db.query.orcamentos.findFirst).mockResolvedValue({
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        numeroOrcamento: 'PRO-2026-0001',
        status: 'RASCUNHO',
        clienteId: 'client-123',
        condicaoPagamentoId: 'cond-123',
        valorTotalVenda: '300.00'
      });

      const req = {
        method: 'PUT',
        url: '/api/orcamentos?id=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        body: { status: 'APROVADO', condicaoPagamentoId: 'cond-123' }
      };

      let responseStatus = 200;
      const res = {
        status: (code: number) => { responseStatus = code; return res; },
        json: () => res
      };

      await handleOrcamentosPro(req, res);
      
      expect(responseStatus).toBe(200);
      
      // Validar se executou o update do status do orçamento
      expect(mockTx.update).toHaveBeenCalled();
      
      // Validar se executou os inserts via SQL bruto (titulos_receber, ordens_producao, movimentacoes_estoque)
      const executeCalls = mockTx.execute.mock.calls;
      const sqlQueries = executeCalls.map(c => obterStringSql(c[0]));
      
      expect(sqlQueries.some(q => q.includes('INSERT INTO titulos_receber'))).toBe(true);
      expect(sqlQueries.some(q => q.includes('INSERT INTO ordens_prod'))).toBe(true);
      expect(sqlQueries.some(q => q.includes('INSERT INTO movimentacoes_estoque'))).toBe(true);
    });
  });
});

