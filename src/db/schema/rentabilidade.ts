import { pgTable, uuid, varchar, integer, decimal, timestamp, date, serial, text } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { orcamentos } from './engenharia-orcamentos.js';
import { ordensProd } from './producao.js';

// NOVA TABELA: Custos Reais de Produção (custos_reais_op)
export const custosReaisOp = pgTable('custos_reais_op', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  operacaoProdId: uuid('operacao_prod_id').references(() => ordensProd.id, { onDelete: 'cascade' }).notNull(),
  orcamentoId: uuid('orcamento_id').references(() => orcamentos.id, { onDelete: 'cascade' }).notNull(),
  
  // Custos estimados (do orçamento)
  custoMaterialEstimado: decimal('custo_material_estimado', { precision: 10, scale: 2 }),
  custoMaoObraEstimada: decimal('custo_mao_obra_estimada', { precision: 10, scale: 2 }),
  tempoHorasEstimado: decimal('tempo_horas_estimado', { precision: 10, scale: 2 }),
  
  // Custos reais (ao finalizar produção)
  custoMaterialReal: decimal('custo_material_real', { precision: 10, scale: 2 }),
  custoMaoObraReal: decimal('custo_mao_obra_real', { precision: 10, scale: 2 }),
  tempoHorasReal: decimal('tempo_horas_real', { precision: 10, scale: 2 }),
  custoRetrabalho: decimal('custo_retrabalho', { precision: 10, scale: 2 }).default('0.00'),
  custoDesperdicioMaterial: decimal('custo_desperdicio_material', { precision: 10, scale: 2 }).default('0.00'),
  
  // Resumo
  custoTotalEstimado: decimal('custo_total_estimado', { precision: 10, scale: 2 }),
  custoTotalReal: decimal('custo_total_real', { precision: 10, scale: 2 }),
  variacaoCusto: decimal('variacao_custo', { precision: 10, scale: 2 }),
  variacaoPercentual: decimal('variacao_percentual', { precision: 5, scale: 2 }),
  
  // Receita e Margem
  valorVenda: decimal('valor_venda', { precision: 10, scale: 2 }),
  margemEstimada: decimal('margem_estimada', { precision: 10, scale: 2 }),
  margemReal: decimal('margem_real', { precision: 10, scale: 2 }),
  margemPercentualReal: decimal('margem_percentual_real', { precision: 5, scale: 2 }),
  
  // Análise
  descricaoDesvios: text('descricao_desvios'),
  responsavelAnalise: uuid('responsavel_analise'), // ID do usuário responsável (referencia users(id))
  dataConclusaoOp: date('data_conclusao_op'),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// NOVA TABELA: Análise de Rentabilidade por Cliente (rentabilidade_cliente)
export const rentabilidadeCliente = pgTable('rentabilidade_cliente', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  clienteId: integer('cliente_id').notNull(), // referencia clients(id)
  totalOrcamentos: integer('total_orcamentos').default(0),
  totalPedidos: integer('total_pedidos').default(0),
  totalVendido: decimal('total_vendido', { precision: 12, scale: 2 }).default('0.00'),
  totalCustosReais: decimal('total_custos_reais', { precision: 12, scale: 2 }).default('0.00'),
  margemTotal: decimal('margem_total', { precision: 12, scale: 2 }).default('0.00'),
  margemMediaPercentual: decimal('margem_media_percentual', { precision: 5, scale: 2 }).default('0.00'),
  ticketMedio: decimal('ticket_medio', { precision: 10, scale: 2 }).default('0.00'),
  operacoesLucrativas: integer('operacoes_lucrativas').default(0),
  operacoesPrejuizadas: integer('operacoes_prejuizadas').default(0),
  scoreRentabilidade: integer('score_rentabilidade').default(0), // 1-10
  ultimoPedidoData: date('ultimo_pedido_data'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// NOVA TABELA: Análise de Tendências de Preço (tendencias_preco)
export const tendenciasPreco = pgTable('tendencias_preco', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  tipoProduto: varchar('tipo_produto', { length: 100 }),
  dataAnalise: date('data_analise'),
  precoMedioMes: decimal('preco_medio_mes', { precision: 10, scale: 2 }),
  precoMinimo: decimal('preco_minimo', { precision: 10, scale: 2 }),
  precoMaximo: decimal('preco_maximo', { precision: 10, scale: 2 }),
  margemMediaMes: decimal('margem_media_mes', { precision: 5, scale: 2 }),
  volumeVendas: integer('volume_vendas'),
  variacaoPrecoMes: decimal('variacao_preco_mes', { precision: 5, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
