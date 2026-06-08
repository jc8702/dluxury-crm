import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleQuotations,
  explodirBOM,
  recalcularOrcamento,
  _resetRateLimit,
} from '../quotations.js';
import { db } from '../drizzle-db.js';
import { validateAuth, sql } from '../_db.js';
import { PgDialect } from 'drizzle-orm/pg-core';

// Mock do banco de dados e auxiliares
vi.mock('../drizzle-db.js', () => {
  const mockDb = {
    query: {
      skuEngenharia: {
        findFirst: vi.fn(),
      },
      quotations: {
        findFirst: vi.fn(),
      },
      skuComponente: {
        findFirst: vi.fn(),
      },
      quotationItems: {
        findFirst: vi.fn(),
      },
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

vi.mock('../_db.js', () => {
  const mockSql = Object.assign(vi.fn().mockResolvedValue([]), {
    begin: vi.fn().mockImplementation(async (cb) =>
      cb(
        Object.assign(vi.fn().mockResolvedValue([]), {
          join: vi.fn((values: any[]) => values),
        }),
      ),
    ),
    join: vi.fn((values: any[]) => values),
  });
  return {
    auditLog: vi.fn().mockResolvedValue({}),
    validateAuth: vi.fn(),
    sql: mockSql,
  };
});

vi.mock('../middleware/tenantMiddleware.js', () => ({
  withTenant: (handler: any) => handler,
}));

const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000000';
const TEST_USER = {
  id: 'u1',
  tenantId: TEST_TENANT_ID,
  role: 'admin',
  email: 't@e.com',
  name: 'Tester',
};

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

describe('Módulo de Orçamentos PRO', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetRateLimit();
    // Retorna um ID aleatório por padrão para que os testes não compartilhem a mesma quota de rate limit
    vi.mocked(validateAuth).mockImplementation(() => {
      return {
        authorized: true,
        tenantId: '00000000-0000-0000-0000-000000000000',
        user: { id: `test-user-${Math.random()}` },
      };
    });
  });

  describe('Validação de Rate Limiting', () => {
    it('deve bloquear requisições após o limite de 100 requisições por janela', async () => {
      const rateLimitUser = `rate-limit-user-${Date.now()}`;
      vi.mocked(validateAuth).mockReturnValue({
        authorized: true,
        tenantId: '00000000-0000-0000-0000-000000000000',
        user: { id: rateLimitUser },
      });

      const req = mockReq({
        method: 'GET',
        url: '/api/quotations?id=some-id',
      });

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
      vi.mocked(db.query.quotations.findFirst).mockResolvedValue({ id: 'some-id', itens: [] });

      for (let i = 0; i < 100; i++) {
        await handleQuotations(req, res);
        expect(responseStatus).toBe(200);
      }

      // A requisição 101 deve ser bloqueada (429)
      await handleQuotations(req, res);
      expect(responseStatus).toBe(429);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Limite de requisições excedido');
    });
  });

  describe('Validação de Payloads de Entrada (POST / Quotations)', () => {
    it('deve retornar 400 ao enviar um payload vazio ou inválido', async () => {
      const req = mockReq({
        method: 'POST',
        body: null,
        url: '/api/quotations',
      });

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

      await handleQuotations(req, res);

      expect(responseStatus).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Payload inválido');
    });

    it('deve retornar 400 ao enviar itens sem skuEngenhariaId ou que não sejam UUID', async () => {
      const req = mockReq({
        method: 'POST',
        url: '/api/quotations',
        body: {
          header: { clienteId: '1' },
          itens: [{ skuEngenhariaId: 'invalid-uuid-format', quantidade: 5 }],
        },
      });

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

      await handleQuotations(req, res);

      expect(responseStatus).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('skuEngenhariaId inválido');
    });

    it('deve retornar 400 ao enviar itens com quantidade negativa ou zero', async () => {
      const req = mockReq({
        method: 'POST',
        url: '/api/quotations',
        body: {
          header: { clienteId: '1' },
          itens: [{ skuEngenhariaId: '3bcc2b2c-68cc-48f8-ba20-bafba6b1fca2', quantidade: -2 }],
        },
      });

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

      await handleQuotations(req, res);

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
      await expect(explodirBOM('3bcc2b2c-68cc-48f8-ba20-bafba6b1fca2', -1)).rejects.toThrow(
        'Quantidade inválida',
      );
    });

    it('deve lançar erro se o SKU de engenharia não existir no banco de dados', async () => {
      vi.mocked(db.query.skuEngenharia.findFirst).mockResolvedValue(null);

      await expect(explodirBOM('3bcc2b2c-68cc-48f8-ba20-bafba6b1fca2', 1)).rejects.toThrow(
        'SKU de Engenharia não encontrado',
      );
    });

    it('deve retornar array vazio se não houver componentes na BOM recursiva', async () => {
      vi.mocked(db.query.skuEngenharia.findFirst).mockResolvedValue({
        id: '3bcc2b2c-68cc-48f8-ba20-bafba6b1fca2',
        nome: 'Test SKU',
      });
      vi.mocked(db.execute).mockResolvedValue({ rows: [] } as any);

      const result = await explodirBOM('3bcc2b2c-68cc-48f8-ba20-bafba6b1fca2', 1);
      expect(result).toEqual([]);
    });

    it('deve retornar a lista de componentes explodidos calculada corretamente', async () => {
      vi.mocked(db.query.skuEngenharia.findFirst).mockResolvedValue({
        id: '3bcc2b2c-68cc-48f8-ba20-bafba6b1fca2',
        nome: 'Test SKU',
      });
      vi.mocked(db.execute).mockResolvedValue({
        rows: [
          {
            sku_componente_id: 'comp-1',
            quantidade_total: '2.5',
            nome: 'Componente Teste',
            codigo: 'COMP001',
            preco_unitario: '10.00',
          },
        ],
      } as any);

      const result = await explodirBOM('3bcc2b2c-68cc-48f8-ba20-bafba6b1fca2', 2);
      expect(result).toHaveLength(1);
      expect(result[0].skuComponenteId).toBe('comp-1');
      expect(result[0].quantidadeCalculada).toBe(5.0); // 2.5 * qtdItem (2)
      expect(result[0].custoUnitario).toBe(10.0);
      expect(result[0].custoTotal).toBe(50.0);
    });
  });

  describe('Recalculo de Quotation (recalcularOrcamento)', () => {
    it('deve falhar se o ID de orçamento for inválido', async () => {
      await expect(recalcularOrcamento('not-uuid')).rejects.toThrow('ID de orçamento inválido');
    });

    it('deve falhar se o orçamento não for encontrado', async () => {
      const mockTx = {
        execute: vi.fn().mockResolvedValue({
          rows: [
            {
              fator_perda_padrao: 0,
              mo_producao_pct_padrao: 0,
              mo_instalacao_pct_padrao: 0,
              aliquota_imposto: 0,
            },
          ],
        }),
        query: {
          quotations: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
        },
      };
      vi.mocked(db.transaction).mockImplementation(async (callback) => {
        return callback(mockTx as any);
      });

      await expect(recalcularOrcamento('3bcc2b2c-68cc-48f8-ba20-bafba6b1fca2')).rejects.toThrow(
        'Orçamento 3bcc2b2c-68cc-48f8-ba20-bafba6b1fca2 não encontrado',
      );
    });

    it('deve recalcular valores considerando taxas operacionais de configuracoes_precificacao', async () => {
      const mockTx = {
        execute: vi.fn().mockResolvedValue({
          rows: [
            {
              fator_perda_padrao: 10, // 10%
              mo_producao_pct_padrao: 20, // 20%
              mo_instalacao_pct_padrao: 5, // 5%
              aliquota_imposto: 15, // 15%
            },
          ],
        }),
        query: {
          quotations: {
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
                  listaExplodida: [],
                },
              ],
            }),
          },
        },
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
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
      expect(result.custoTotal).toBeCloseTo(277.2, 1); // 138.60 * 2
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
          return query.queryChunks
            .map((chunk: any) => {
              if (typeof chunk === 'string') return chunk;
              if (chunk && typeof chunk === 'object') {
                if (chunk.queryChunks) return obterStringSql(chunk);
                if (Array.isArray(chunk.value)) return chunk.value.join('');
                if (chunk.name) return chunk.name;
              }
              return '';
            })
            .join('');
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
            return {
              rows: [{ id: 'mat-123', sku: 'chp-mdf-15', estoque_atual: 10, preco_custo: 50.0 }],
            };
          }
          return { rows: [] };
        }),
        query: {
          quotations: {
            findFirst: vi.fn().mockResolvedValue({
              id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
              numeroOrcamento: 'PRO-2026-0001',
              status: 'RASCUNHO',
              clienteId: 'client-123',
              condicaoPagamentoId: 'cond-123',
              valorTotalVenda: '300.00',
              itens: [],
            }),
          },
          quotationItems: {
            findMany: vi.fn().mockResolvedValue([
              {
                id: 'item-1',
                skuEngenhariaId: 'sku-eng-123',
                nomeCustomizado: 'Painel Tv',
                quantidade: '1',
                bom: [
                  {
                    skuComponenteId: 'comp-123',
                    quantidadeCalculada: '2',
                    custoUnitario: '25.00',
                    componente: { codigo: 'CHP-MDF-15', nome: 'MDF 15MM' },
                  },
                ],
              },
            ]),
          },
        },
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
      };

      vi.mocked(db.transaction).mockImplementation(async (callback) => {
        return callback(mockTx as any);
      });

      // Mock do findFirst da checagem externa de exists
      vi.mocked(db.query.quotations.findFirst).mockResolvedValue({
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        numeroOrcamento: 'PRO-2026-0001',
        status: 'RASCUNHO',
        clienteId: 'client-123',
        condicaoPagamentoId: 'cond-123',
        valorTotalVenda: '300.00',
      });

      const req = mockReq({
        method: 'PUT',
        url: '/api/quotations?id=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        body: { status: 'APROVADO', condicaoPagamentoId: 'cond-123' },
      });

      let responseStatus = 200;
      const res = {
        status: (code: number) => {
          responseStatus = code;
          return res;
        },
        json: () => res,
      };

      await handleQuotations(req, res);

      expect(responseStatus).toBe(200);

      // Validar se executou o update do status do orçamento
      expect(mockTx.update).toHaveBeenCalled();

      // Validar se executou os inserts via SQL bruto (titulos_receber, ordens_producao, movimentacoes_estoque)
      const executeCalls = mockTx.execute.mock.calls;
      const sqlQueries = executeCalls.map((c) => obterStringSql(c[0]));

      expect(sqlQueries.some((q) => q.includes('INSERT INTO titulos_receber'))).toBe(true);
      expect(sqlQueries.some((q) => q.includes('INSERT INTO ordens_prod'))).toBe(true);
      expect(sqlQueries.some((q) => q.includes('INSERT INTO movimentacoes_estoque'))).toBe(true);
    });
  });

  describe('Fluxos Avançados de GET, PUT e DELETE', () => {
    function mockRes() {
      let sc = 200,
        jd: any = null;
      const self: any = {
        status: (c: number) => {
          sc = c;
          return self;
        },
        json: (d: any) => {
          jd = d;
          return self;
        },
        end: () => self,
        _s: () => sc,
        _d: () => jd,
      };
      return self;
    }

    let mockTxPadrao: any;

    beforeEach(() => {
      vi.mocked(db.execute).mockResolvedValue({ rows: [] } as any);

      mockTxPadrao = {
        execute: vi.fn().mockResolvedValue({ rows: [] }),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
        delete: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
        query: {
          quotations: {
            findFirst: vi.fn().mockResolvedValue({
              id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
              margemLucroPercentual: '30',
              taxaFinanceiraPercentual: '2',
              descontoPercentual: '5',
              itens: [
                {
                  id: '3bcc2b2c-68cc-48f8-ba20-bafba6b1fca2',
                  quantidade: '2',
                  custoUnitarioCalculado: '100.00',
                  possuiOverride: false,
                  bom: [],
                },
              ],
            }),
          },
          quotationItems: {
            findFirst: vi.fn().mockResolvedValue({
              id: '3bcc2b2c-68cc-48f8-ba20-bafba6b1fca2',
            }),
          },
          skuComponente: {
            findFirst: vi.fn().mockResolvedValue({
              id: '3bcc2b2c-68cc-48f8-ba20-bafba6b1fca2',
              precoUnitario: '10.00',
            }),
          },
        },
      };

      vi.mocked(db.transaction).mockImplementation(async (cb) => cb(mockTxPadrao));
    });

    it('deve explodir BOM no GET (?action=explode)', async () => {
      vi.mocked(db.query.skuEngenharia.findFirst).mockResolvedValue({
        id: '3bcc2b2c-68cc-48f8-ba20-bafba6b1fca2',
        nome: 'Test SKU',
      });
      vi.mocked(db.execute).mockResolvedValue({
        rows: [
          {
            sku_componente_id: '3bcc2b2c-68cc-48f8-ba20-bafba6b1fca2',
            quantidade_total: '2.0',
            nome: 'Componente Teste',
            codigo: 'COMP001',
            preco_unitario: '10.00',
          },
        ],
      } as any);

      const req = mockReq({
        method: 'GET',
        url: '/api/quotations?action=explode&skuId=3bcc2b2c-68cc-48f8-ba20-bafba6b1fca2&qtd=2',
      });
      const res = mockRes();
      await handleQuotations(req, res);
      expect(res._s()).toBe(200);
      expect(res._d().data).toHaveLength(1);
    });

    it('deve buscar SKUs no GET (?action=search-skus)', async () => {
      vi.mocked(db.select).mockReturnValue(db as any);
      vi.mocked(db.from).mockReturnValue(db as any);
      vi.mocked(db.where).mockReturnValue(db as any);
      vi.mocked(db.limit).mockResolvedValue([
        {
          id: '3bcc2b2c-68cc-48f8-ba20-bafba6b1fca2',
          codigo: 'COMP001',
          nome: 'Comp',
          precoUnitario: '10.00',
        },
      ]);

      const req = mockReq({
        method: 'GET',
        url: '/api/quotations?action=search-skus&q=MDF&limit=5',
      });
      const res = mockRes();
      await handleQuotations(req, res);
      expect(res._s()).toBe(200);
      expect(res._d().data.length).toBeGreaterThan(0);
    });

    it('deve listar orçamentos no GET geral', async () => {
      vi.mocked(db.select).mockReturnValue(db as any);
      vi.mocked(db.from).mockReturnValue(db as any);
      vi.mocked(db.where).mockImplementation((cond: any) => {
        return db as any;
      });
      vi.mocked(db.orderBy).mockReturnValue(db as any);
      vi.mocked(db.limit).mockReturnValue(db as any);
      vi.mocked(db.offset).mockResolvedValueOnce([
        { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', numeroOrcamento: 'PRO-1' },
      ]);

      vi.mocked(db.select)
        .mockReturnValueOnce(db as any)
        .mockReturnValueOnce({
          from: () => ({
            where: () => Promise.resolve([{ count: '1' }]),
          }),
        } as any);

      const req = mockReq({
        method: 'GET',
        url: '/api/quotations?page=1&limit=10',
      });
      const res = mockRes();
      await handleQuotations(req, res);
      expect(res._s()).toBe(200);
      expect(res._d().pagination.total).toBe(1);
    });

    it('deve atualizar BOM no PUT (?action=update-bom)', async () => {
      vi.mocked(db.query.quotations.findFirst).mockResolvedValue({
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        tenantId: '00000000-0000-0000-0000-000000000000',
      });
      vi.mocked(db.select).mockReturnValue({
        from: () => ({
          join: () => ({
            where: () => Promise.resolve([{ id: 'item-123' }]),
          }),
        }),
      } as any);
      vi.mocked(db.update).mockReturnValue({
        set: () => ({
          where: () => Promise.resolve([]),
        }),
      } as any);

      const req = mockReq({
        method: 'PUT',
        url: '/api/quotations?id=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11&action=update-bom',
        body: { bomId: '3bcc2b2c-68cc-48f8-ba20-bafba6b1fca2', quantidadeAjustada: 5 },
      });
      const res = mockRes();
      await handleQuotations(req, res);
      expect(res._s()).toBe(200);
    });

    it('deve redefinir para margem global no PUT (?action=reset-to-global-margin)', async () => {
      vi.mocked(db.query.quotations.findFirst).mockResolvedValue({
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      });
      vi.mocked(db.update).mockReturnValue({
        set: () => ({
          where: () => Promise.resolve([]),
        }),
      } as any);

      const req = mockReq({
        method: 'PUT',
        url: '/api/quotations?id=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11&action=reset-to-global-margin',
        body: { itemIds: ['3bcc2b2c-68cc-48f8-ba20-bafba6b1fca2'] },
      });
      const res = mockRes();
      await handleQuotations(req, res);
      expect(res._s()).toBe(200);
    });

    it('deve aplicar margem global no PUT (?action=apply-global-margin)', async () => {
      vi.mocked(db.query.quotations.findFirst).mockResolvedValue({
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      });
      vi.mocked(db.select).mockReturnValue({
        from: () => ({
          where: () => Promise.resolve([{ count: '1' }]),
        }),
      } as any);

      const req = mockReq({
        method: 'PUT',
        url: '/api/quotations?id=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11&action=apply-global-margin',
        body: { margem: 35 },
      });
      const res = mockRes();
      await handleQuotations(req, res);
      expect(res._s()).toBe(200);
    });

    it('deve atualizar itens em lote no PUT (?action=bulk-update-items)', async () => {
      vi.mocked(db.query.quotations.findFirst).mockResolvedValue({
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      });
      mockTxPadrao.select = () => ({
        from: () => ({
          where: () =>
            Promise.resolve([
              { id: '3bcc2b2c-68cc-48f8-ba20-bafba6b1fca2', precoVendaUnitario: '100' },
            ]),
        }),
      });

      const req = mockReq({
        method: 'PUT',
        url: '/api/quotations?id=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11&action=bulk-update-items',
        body: {
          itemIds: ['3bcc2b2c-68cc-48f8-ba20-bafba6b1fca2'],
          updates: { percentualPreco: 10, percentualCusto: 5 },
        },
      });
      const res = mockRes();
      await handleQuotations(req, res);
      expect(res._s()).toBe(200);
    });

    it('deve atualizar SKU de engenharia no PUT (?action=update-sku)', async () => {
      vi.mocked(db.query.quotations.findFirst).mockResolvedValue({
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      });

      const req = mockReq({
        method: 'PUT',
        url: '/api/quotations?id=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11&action=update-sku',
        body: {
          itemId: '3bcc2b2c-68cc-48f8-ba20-bafba6b1fca2',
          skuId: '3bcc2b2c-68cc-48f8-ba20-bafba6b1fca2',
          tipo: 'ENGENHARIA',
        },
      });
      const res = mockRes();
      await handleQuotations(req, res);
      expect(res._s()).toBe(200);
    });

    it('deve atualizar item no PUT (?action=update-item)', async () => {
      vi.mocked(db.query.quotations.findFirst).mockResolvedValue({
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      });

      const req = mockReq({
        method: 'PUT',
        url: '/api/quotations?id=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11&action=update-item',
        body: {
          itemId: '3bcc2b2c-68cc-48f8-ba20-bafba6b1fca2',
          skuId: '3bcc2b2c-68cc-48f8-ba20-bafba6b1fca2',
          skuTipo: 'ENGENHARIA',
          quantidade: 3,
        },
      });
      const res = mockRes();
      await handleQuotations(req, res);
      expect(res._s()).toBe(200);
    });

    it('deve deletar item no PUT (?action=delete-item)', async () => {
      vi.mocked(db.query.quotations.findFirst).mockResolvedValue({
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      });
      vi.mocked(db.delete).mockReturnValue({
        where: () => Promise.resolve([]),
      } as any);

      const req = mockReq({
        method: 'PUT',
        url: '/api/quotations?id=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11&action=delete-item',
        body: { itemId: '3bcc2b2c-68cc-48f8-ba20-bafba6b1fca2' },
      });
      const res = mockRes();
      await handleQuotations(req, res);
      expect(res._s()).toBe(200);
    });

    it('deve retornar 400 no PUT sem ID', async () => {
      const req = mockReq({
        method: 'PUT',
        url: '/api/quotations',
        body: {},
      });
      const res = mockRes();
      await handleQuotations(req, res);
      expect(res._s()).toBe(400);
    });

    it('deve retornar 404 no PUT com ID inexistente', async () => {
      vi.mocked(db.query.quotations.findFirst).mockResolvedValue(null);

      const req = mockReq({
        method: 'PUT',
        url: '/api/quotations?id=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        body: {},
      });
      const res = mockRes();
      await handleQuotations(req, res);
      expect(res._s()).toBe(404);
    });

    it('deve deletar orçamento (DELETE)', async () => {
      vi.mocked(db.delete).mockReturnValue({
        where: () => Promise.resolve([]),
      } as any);

      const req = mockReq({
        method: 'DELETE',
        url: '/api/quotations?id=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      });
      const res = mockRes();
      await handleQuotations(req, res);
      expect(res._s()).toBe(200);
    });

    it('deve retornar 400 no DELETE sem ID', async () => {
      const req = mockReq({
        method: 'DELETE',
        url: '/api/quotations',
      });
      const res = mockRes();
      await handleQuotations(req, res);
      expect(res._s()).toBe(400);
    });

    it('deve importar itens via CSV no PUT (?action=import-items)', async () => {
      vi.mocked(db.query.quotations.findFirst).mockResolvedValue({
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      });

      vi.mocked(db.select).mockReturnValue({
        from: () => ({
          where: () =>
            Promise.resolve([
              {
                id: '3bcc2b2c-68cc-48f8-ba20-bafba6b1fca2',
                codigo: 'COMP001',
                nome: 'Comp',
                precoUnitario: '10.00',
              },
            ]),
        }),
      } as any);

      vi.mocked(db.execute).mockResolvedValue({
        rows: [
          {
            id: '3bcc2b2c-68cc-48f8-ba20-bafba6b1fca2',
            codigo: 'MAT001',
            nome: 'Mat',
            precoUnitario: '15.00',
          },
        ],
      } as any);

      mockTxPadrao.insert = vi.fn().mockReturnThis();
      mockTxPadrao.values = vi.fn().mockReturnThis();
      mockTxPadrao.returning = vi
        .fn()
        .mockResolvedValue([{ id: '3bcc2b2c-68cc-48f8-ba20-bafba6b1fca2', quantidade: '2' }]);

      const req = mockReq({
        method: 'PUT',
        url: '/api/quotations?id=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11&action=import-items',
        body: {
          items: [
            {
              nome: 'Item CSV',
              quantidade: 2,
              sku_id: '3bcc2b2c-68cc-48f8-ba20-bafba6b1fca2',
              custoUnitario: 10,
            },
          ],
        },
      });
      const res = mockRes();
      await handleQuotations(req, res);
      expect(res._s()).toBe(200);
      expect(res._d().data.success).toBe(1);
    });
  });
});
