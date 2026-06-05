import { pgTable, uuid, varchar, text, timestamp, boolean, integer, serial, decimal } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { ordensProd } from './producao.js';
import { quotations } from './quotations.js';

// EstoqueMateriaisDetalhado (estoque_materiais_detalhado)
export const estoqueMateriaisDetalhado = pgTable('estoque_materiais_detalhado', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  skuCodigo: varchar('sku_codigo', { length: 50 }).unique().notNull(),
  descricao: varchar('descricao', { length: 255 }).notNull(),
  unidadeMedida: varchar('unidade_medida', { length: 20 }).default('un'),
  
  quantidadeDisponivel: integer('quantidade_disponivel').default(0),
  quantidadeEmTransito: integer('quantidade_em_transito').default(0),
  quantidadeProvisionado: integer('quantidade_provisionado').default(0),
  quantidadeDefeituoso: integer('quantidade_defeituoso').default(0),
  quantidadeVencido: integer('quantidade_vencido').default(0),
  
  quantidadeMinima: integer('quantidade_minima').default(10),
  quantidadeMaxima: integer('quantidade_maxima').default(500),
  leadTimeDias: integer('lead_time_dias').default(7),
  
  precoCustoUnitario: decimal('preco_custo_unitario', { precision: 10, scale: 2 }),
  valorTotalEstoque: decimal('valor_total_estoque', { precision: 12, scale: 2 }),
  
  fornecedorId: integer('fornecedor_id'),
  dataUltimaCompra: timestamp('data_ultima_compra', { withTimezone: true }),
  dataProximaReposicao: timestamp('data_proxima_reposicao', { withTimezone: true }),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// MovimentoEstoque (movimento_estoque_granular)
export const movimentoEstoqueGranular = pgTable('movimento_estoque_granular', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  skuCodigo: varchar('sku_codigo', { length: 50 }).references(() => estoqueMateriaisDetalhado.skuCodigo),
  operacaoProdId: uuid('operacao_prod_id').references(() => ordensProd.id),
  orcamentoId: uuid('orcamento_id').references(() => orcamentos.id),
  
  tipoMovimento: varchar('tipo_movimento', { length: 50 }).notNull(), // 'entrada_compra', 'saida_producao', 'devolucao', 'descarte', 'rejeicao_qc', 'ajuste'
  quantidadeMovimento: integer('quantidade_movimento').notNull(),
  statusAnterior: varchar('status_anterior', { length: 50 }),
  statusNovo: varchar('status_novo', { length: 50 }),
  
  saldoAnterior: integer('saldo_anterior'),
  saldoNovo: integer('saldo_novo'),
  
  motivoDescricao: text('motivo_descricao'),
  usuarioId: uuid('usuario_id'),
  timestampMovimento: timestamp('timestamp_movimento', { withTimezone: true }).defaultNow(),
});

// AlertasEstoque (alertas_estoque)
export const alertasEstoque = pgTable('alertas_estoque', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  skuCodigo: varchar('sku_codigo', { length: 50 }).references(() => estoqueMateriaisDetalhado.skuCodigo),
  tipoAlerta: varchar('tipo_alerta', { length: 50 }), // 'minimo_atingido', 'maximo_excedido', 'em_falta', 'vencimento_proximo', 'muito_atrasado'
  quantidadeAtual: integer('quantidade_atual'),
  limiteAlerta: integer('limite_alerta'),
  severidade: varchar('severidade', { length: 20 }), // 'critica', 'alerta', 'aviso'
  ativo: boolean('ativo').default(true),
  dataAlerta: timestamp('data_alerta', { withTimezone: true }).defaultNow(),
  dataResolucao: timestamp('data_resolucao', { withTimezone: true }),
  usuarioNotificadoId: uuid('usuario_notificado_id'),
});

// PlanejamentoReposicao (planejamento_reposicao)
export const planejamentoReposicao = pgTable('planejamento_reposicao', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  skuCodigo: varchar('sku_codigo', { length: 50 }).references(() => estoqueMateriaisDetalhado.skuCodigo),
  quantidadeNecessaria: integer('quantidade_necessaria'),
  dataNecessarioAte: timestamp('data_necessario_ate', { withTimezone: true }),
  operacaoProdId: uuid('operacao_prod_id').references(() => ordensProd.id),
  statusPlanejamento: varchar('status_planejamento', { length: 50 }), // 'planejado', 'compra_emitida', 'recebido'
  ordemCompraId: integer('ordem_compra_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// OrdensCompra (ordens_compra_granular)
export const ordensCompraGranular = pgTable('ordens_compra_granular', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  numeroOc: varchar('numero_oc', { length: 50 }).unique().notNull(),
  fornecedorId: integer('fornecedor_id'),
  dataEmissao: timestamp('data_emissao', { withTimezone: true }),
  dataEntregaPrevista: timestamp('data_entrega_prevista', { withTimezone: true }),
  dataEntregaReal: timestamp('data_entrega_real', { withTimezone: true }),
  statusOc: varchar('status_oc', { length: 50 }), // 'emitida', 'confirmada', 'parcialmente_recebida', 'recebida', 'cancelada'
  valorTotal: decimal('valor_total', { precision: 12, scale: 2 }),
  observacoes: text('observacoes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ItensOC (itens_oc_granular)
export const itensOcGranular = pgTable('itens_oc_granular', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  ordemCompraId: integer('ordem_compra_id').references(() => ordensCompraGranular.id, { onDelete: 'cascade' }).notNull(),
  skuCodigo: varchar('sku_codigo', { length: 50 }).references(() => estoqueMateriaisDetalhado.skuCodigo),
  quantidadeSolicitada: integer('quantidade_solicitada'),
  quantidadeRecebida: integer('quantidade_recebida').default(0),
  precoUnitario: decimal('preco_unitario', { precision: 10, scale: 2 }),
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }),
});

// MapeamentoSKU (mapeamento_sku)
export const mapeamentoSku = pgTable('mapeamento_sku', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  skuPromob: varchar('sku_promob', { length: 100 }).notNull(),
  skuInterno: varchar('sku_interno', { length: 50 }).references(() => estoqueMateriaisDetalhado.skuCodigo),
  nomePromob: varchar('nome_promob', { length: 255 }),
  nomeInterno: varchar('nome_interno', { length: 255 }),
  confiancaMatch: integer('confianca_match').default(100),
  tipoMatch: varchar('tipo_match', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  validadoPor: uuid('validado_por'),
  dataValidacao: timestamp('data_validation', { withTimezone: true }),
});

// HistoricoSKUMatching (historico_sku_matching)
export const historicoSkuMatching = pgTable('historico_sku_matching', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  orcamentoId: uuid('orcamento_id').references(() => quotations.id, { onDelete: 'cascade' }),
  skuProcurado: varchar('sku_procurado', { length: 100 }).notNull(),
  skusSugeridos: varchar('skus_sugeridos', { length: 500 }),
  skuSelecionado: varchar('sku_selecionado', { length: 50 }),
  timestampMatching: timestamp('timestamp_matching', { withTimezone: true }).defaultNow(),
  usuarioId: uuid('usuario_id'),
});
