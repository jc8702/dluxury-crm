import { pgTable, uuid, varchar, numeric, timestamp, boolean, integer, text } from 'drizzle-orm/pg-core';

// ──────────────────────────────────────────
// CLASSES FINANCEIRAS
// ──────────────────────────────────────────

export const classesFinanceiras = pgTable('classes_financeiras', {
  id: uuid('id').defaultRandom().primaryKey(),
  codigo: varchar('codigo', { length: 50 }).notNull().unique(),
  nome: varchar('nome', { length: 255 }).notNull(),
  tipo: varchar('tipo', { length: 20 }).notNull(), // 'sintetica' | 'analitica'
  natureza: varchar('natureza', { length: 20 }).notNull(), // 'credora' | 'devedora'
  pai_id: uuid('pai_id').references(() => classesFinanceiras.id),
  ativa: boolean('ativa').default(true),
  dt_limite: timestamp('dt_limite'),
  permite_lancamento: boolean('permite_lancamento').default(true),
  criado_em: timestamp('criado_em').defaultNow(),
  atualizado_em: timestamp('atualizado_em').defaultNow(),
});

// ──────────────────────────────────────────
// CONTAS INTERNAS (CAIXA E BANCOS)
// ──────────────────────────────────────────

export const contasInternas = pgTable('contas_internas', {
  id: uuid('id').defaultRandom().primaryKey(),
  nome: varchar('nome', { length: 255 }).notNull(),
  tipo: varchar('tipo', { length: 50 }).notNull(),
  banco_codigo: varchar('banco_codigo', { length: 10 }),
  agencia: varchar('agencia', { length: 20 }),
  conta: varchar('conta', { length: 30 }),
  saldo_inicial: numeric('saldo_inicial', { precision: 15, scale: 2 }).default('0'),
  saldo_atual: numeric('saldo_atual', { precision: 15, scale: 2 }).default('0'),
  data_saldo_inicial: timestamp('data_saldo_inicial'),
  ativa: boolean('ativa').default(true),
  criado_em: timestamp('criado_em').defaultNow(),
});

// ──────────────────────────────────────────
// TÍTULOS A RECEBER
// ──────────────────────────────────────────

export const titulosReceber = pgTable('titulos_receber', {
  id: uuid('id').defaultRandom().primaryKey(),
  numero_titulo: varchar('numero_titulo', { length: 50 }).notNull().unique(),
  cliente_id: uuid('cliente_id').notNull(),
  projeto_id: uuid('projeto_id'),
  orcamento_id: uuid('orcamento_id'),
  condicao_pagamento_id: uuid('condicao_pagamento_id').references(() => condicoesPagamento.id),

  valor_original: numeric('valor_original', { precision: 15, scale: 2 }).notNull(),
  valor_liquido: numeric('valor_liquido', { precision: 15, scale: 2 }).notNull(),
  valor_juros: numeric('valor_juros', { precision: 15, scale: 2 }).default('0'),
  valor_multa: numeric('valor_multa', { precision: 15, scale: 2 }).default('0'),
  valor_desconto: numeric('valor_desconto', { precision: 15, scale: 2 }).default('0'),
  valor_aberto: numeric('valor_aberto', { precision: 15, scale: 2 }).notNull(),

  data_emissao: timestamp('data_emissao').notNull(),
  data_vencimento: timestamp('data_vencimento').notNull(),
  data_competencia: timestamp('data_competencia').notNull(),
  data_pagamento: timestamp('data_pagamento'),

  classe_financeira_id: uuid('classe_financeira_id').references(() => classesFinanceiras.id).notNull(),
  centro_custo_id: uuid('centro_custo_id'),
  forma_recebimento_id: uuid('forma_recebimento_id').notNull(),

  status: varchar('status', { length: 30 }).notNull(),
  parcela: integer('parcela').notNull(),
  total_parcelas: integer('total_parcelas').notNull(),
  observacoes: text('observacoes'),

  criado_em: timestamp('criado_em').defaultNow(),
  atualizado_em: timestamp('atualizado_em').defaultNow(),
  // Auditoria / soft-delete
  criado_por: uuid('criado_por'),
  atualizado_por: uuid('atualizado_por'),
  deletado: boolean('deletado').default(false),
  excluido_em: timestamp('excluido_em'),
});

// ──────────────────────────────────────────
// TÍTULOS A PAGAR
// ──────────────────────────────────────────

export const titulosPagar = pgTable('titulos_pagar', {
  id: uuid('id').defaultRandom().primaryKey(),
  numero_titulo: varchar('numero_titulo', { length: 50 }).notNull().unique(),
  fornecedor_id: uuid('fornecedor_id').notNull(),
  nota_fiscal: varchar('nota_fiscal', { length: 100 }),
  pedido_compra_id: uuid('pedido_compra_id'),
  condicao_pagamento_id: uuid('condicao_pagamento_id').references(() => condicoesPagamento.id),

  valor_original: numeric('valor_original', { precision: 15, scale: 2 }).notNull(),
  valor_liquido: numeric('valor_liquido', { precision: 15, scale: 2 }).notNull(),
  valor_juros: numeric('valor_juros', { precision: 15, scale: 2 }).default('0'),
  valor_multa: numeric('valor_multa', { precision: 15, scale: 2 }).default('0'),
  valor_desconto: numeric('valor_desconto', { precision: 15, scale: 2 }).default('0'),
  valor_aberto: numeric('valor_aberto', { precision: 15, scale: 2 }).notNull(),

  data_emissao: timestamp('data_emissao').notNull(),
  data_vencimento: timestamp('data_vencimento').notNull(),
  data_competencia: timestamp('data_competencia').notNull(),
  data_pagamento: timestamp('data_pagamento'),

  classe_financeira_id: uuid('classe_financeira_id').references(() => classesFinanceiras.id).notNull(),
  centro_custo_id: uuid('centro_custo_id'),
  forma_pagamento_id: uuid('forma_pagamento_id').notNull(),
  conta_bancaria_id: uuid('conta_bancaria_id').references(() => contasInternas.id).notNull(),

  status: varchar('status', { length: 30 }).notNull(),
  parcela: integer('parcela').notNull(),
  total_parcelas: integer('total_parcelas').notNull(),
  tipo_despesa: varchar('tipo_despesa', { length: 30 }),
  observacoes: text('observacoes'),

  criado_em: timestamp('criado_em').defaultNow(),
  atualizado_em: timestamp('atualizado_em').defaultNow(),
  criado_por: uuid('criado_por'),
  atualizado_por: uuid('atualizado_por'),
  deletado: boolean('deletado').default(false),
  excluido_em: timestamp('excluido_em'),
});

// ──────────────────────────────────────────
// MOVIMENTAÇÕES DE TESOURARIA
// ──────────────────────────────────────────

export const movimentacoesTesouraria = pgTable('movimentacoes_tesouraria', {
  id: uuid('id').defaultRandom().primaryKey(),
  tipo: varchar('tipo', { length: 30 }).notNull(),
  conta_origem_id: uuid('conta_origem_id').references(() => contasInternas.id),
  conta_destino_id: uuid('conta_destino_id').references(() => contasInternas.id),
  valor: numeric('valor', { precision: 15, scale: 2 }).notNull(),
  data_movimento: timestamp('data_movimento').notNull(),
  classe_financeira_id: uuid('classe_financeira_id').references(() => classesFinanceiras.id),
  descricao: varchar('descricao', { length: 500 }).notNull(),
  comprovante_url: varchar('comprovante_url', { length: 500 }),
  conciliado: boolean('conciliado').default(false),
  criado_em: timestamp('criado_em').defaultNow(),
});

// ──────────────────────────────────────────
// BAIXAS (PAGAMENTOS/RECEBIMENTOS)
// ──────────────────────────────────────────

export const baixas = pgTable('baixas', {
  id: uuid('id').defaultRandom().primaryKey(),
  tipo: varchar('tipo', { length: 20 }).notNull(), // 'recebimento' | 'pagamento'
  titulo_id: uuid('titulo_id').notNull(),
  valor_baixa: numeric('valor_baixa', { precision: 15, scale: 2 }).notNull(),
  valor_juros: numeric('valor_juros', { precision: 15, scale: 2 }).default('0'),
  valor_multa: numeric('valor_multa', { precision: 15, scale: 2 }).default('0'),
  valor_desconto: numeric('valor_desconto', { precision: 15, scale: 2 }).default('0'),
  data_baixa: timestamp('data_baixa').notNull(),
  conta_interna_id: uuid('conta_interna_id').references(() => contasInternas.id).notNull(),
  observacoes: text('observacoes'),
  criado_em: timestamp('criado_em').defaultNow(),
  criado_por: uuid('criado_por'),
  atualizado_por: uuid('atualizado_por'),
});

// ──────────────────────────────────────────
// FORMAS DE PAGAMENTO/RECEBIMENTO
// ──────────────────────────────────────────

export const formasPagamento = pgTable('formas_pagamento', {
  id: uuid('id').defaultRandom().primaryKey(),
  nome: varchar('nome', { length: 100 }).notNull(),
  tipo: varchar('tipo', { length: 30 }).notNull(), // 'dinheiro', 'pix', 'boleto', 'cartao_credito', etc
  taxa_percentual: numeric('taxa_percentual', { precision: 5, scale: 2 }).default('0'),
  prazo_compensacao_dias: integer('prazo_compensacao_dias').default(0),
  ativa: boolean('ativa').default(true),
});

// ──────────────────────────────────────────
// CONDIÇÕES DE PAGAMENTO (Parcelamento/Entrada)
// ──────────────────────────────────────────

export const condicoesPagamento = pgTable('condicoes_pagamento', {
  id: uuid('id').defaultRandom().primaryKey(),
  nome: varchar('nome', { length: 150 }).notNull(),
  descricao: text('descricao'),
  parcelas: integer('parcelas').notNull().default(1),
  entrada_percentual: numeric('entrada_percentual', { precision: 5, scale: 2 }).default('0'),
  juros_percentual: numeric('juros_percentual', { precision: 5, scale: 2 }).default('0'),
  ativo: boolean('ativo').default(true),
  criado_em: timestamp('criado_em').defaultNow(),
});

// ──────────────────────────────────────────
// CONTAS RECORRENTES
// ──────────────────────────────────────────

export const contasRecorrentes = pgTable('contas_recorrentes', {
  id: uuid('id').defaultRandom().primaryKey(),
  descricao: varchar('descricao', { length: 255 }).notNull(),
  tipo: varchar('tipo', { length: 20 }).notNull(), // 'receita' | 'despesa'
  valor: numeric('valor', { precision: 15, scale: 2 }).notNull(),
  dia_vencimento: integer('dia_vencimento').notNull(),
  classe_financeira_id: uuid('classe_financeira_id').references(() => classesFinanceiras.id).notNull(),
  fornecedor_id: uuid('fornecedor_id'),
  forma_pagamento_id: uuid('forma_pagamento_id').references(() => formasPagamento.id),
  conta_bancaria_id: uuid('conta_bancaria_id').references(() => contasInternas.id),
  ativa: boolean('ativa').default(true),
  criado_em: timestamp('criado_em').defaultNow(),
});

// Contadores para numeração de documentos e sequências por entidade
export const counters = pgTable('counters', {
  id: uuid('id').defaultRandom().primaryKey(),
  entidade: varchar('entidade', { length: 100 }).notNull(),
  chave: varchar('chave', { length: 100 }),
  seq: integer('seq').default(0),
  criado_em: timestamp('criado_em').defaultNow(),
});
