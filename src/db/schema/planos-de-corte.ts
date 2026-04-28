import { pgTable, uuid, varchar, integer, jsonb, text, timestamp, numeric, boolean } from 'drizzle-orm/pg-core';

// 1. Tabela Principal de Planos de Corte
export const planosDeCorte = pgTable('planos_de_corte', {
  id: uuid('id').defaultRandom().primaryKey(),
  nome: varchar('nome', { length: 255 }).notNull(),
  sku_engenharia: varchar('sku_engenharia', { length: 100 }),
  kerf_mm: integer('kerf_mm').default(3),
  materiais: jsonb('materiais').notNull(),       // Armazena ChapaMaterial[]
  resultado: jsonb('resultado'),                  // Armazena ResultadoOtimizacao
  visita_id: uuid('visita_id'),
  projeto_id: uuid('projeto_id'),
  orcamento_id: uuid('orcamento_id'),
  ordem_producao_id: uuid('ordem_producao_id'),
  observacoes: text('observacoes'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
  deleted_at: timestamp('deleted_at'),
});

// 2. Tabela de Chapas (Estoque Industrial)
export const erpChapas = pgTable('erp_chapas', {
  id: uuid('id').defaultRandom().primaryKey(),
  sku: varchar('sku', { length: 100 }).unique().notNull(),
  nome: varchar('nome', { length: 255 }).notNull(),
  largura_mm: integer('largura_mm').notNull(),
  altura_mm: integer('altura_mm').notNull(),
  espessura_mm: integer('espessura_mm').notNull(),
  preco_unitario: numeric('preco_unitario', { precision: 12, scale: 2 }),
  ativo: boolean('ativo').default(true),
  created_at: timestamp('created_at').defaultNow(),
});

// 3. Tabela de SKUs de Engenharia (Mock Base para Funcionalidade 4)
export const erpSkusEngenharia = pgTable('erp_skus_engenharia', {
  id: uuid('id').defaultRandom().primaryKey(),
  sku: varchar('sku', { length: 100 }).unique().notNull(),
  nome: varchar('nome', { length: 255 }).notNull(),
  componentes: jsonb('componentes').notNull(), // Lista de peças e materiais
  versao: integer('versao').default(1),
  ativo: boolean('ativo').default(true),
  created_at: timestamp('created_at').defaultNow(),
});

// 4. Tabela de Retalhos (Sobras Reutilizáveis)
export const retalhosEstoque = pgTable('retalhos_estoque', {
  id: uuid('id').defaultRandom().primaryKey(),
  largura_mm: integer('largura_mm').notNull(),
  altura_mm: integer('altura_mm').notNull(),
  espessura_mm: integer('espessura_mm').notNull(),
  sku_chapa: varchar('sku_chapa', { length: 100 }).notNull(),
  origem: varchar('origem', { length: 50 }).notNull(), // 'sobra_plano_corte', 'devolucao', 'manual', 'ajuste'
  plano_corte_origem_id: uuid('plano_corte_origem_id'),
  projeto_origem: varchar('projeto_origem', { length: 255 }),
  observacoes: text('observacoes'),
  disponivel: boolean('disponivel').default(true).notNull(),
  utilizado_em_id: uuid('utilizado_em_id'),
  data_utilizacao: timestamp('data_utilizacao', { withTimezone: true }),
  descartado: boolean('descartado').default(false).notNull(),
  motivo_descarte: varchar('motivo_descarte', { length: 255 }),
  data_descarte: timestamp('data_descarte', { withTimezone: true }),
  localizacao: varchar('localizacao', { length: 100 }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deleted_at: timestamp('deleted_at', { withTimezone: true }),
  usuario_criou: varchar('usuario_criou', { length: 100 }),
  usuario_atualizou: varchar('usuario_atualizou', { length: 100 }),
  metadata: jsonb('metadata').default({}),
});
