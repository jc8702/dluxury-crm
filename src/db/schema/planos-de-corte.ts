import { pgTable, uuid, varchar, integer, jsonb, text, timestamp, numeric, boolean } from 'drizzle-orm/pg-core';

// 1. Tabela Principal de Planos de Corte
export const planosDeCorte = pgTable('planos_de_corte', {
  id: uuid('id').defaultRandom().primaryKey(),
  nome: varchar('nome', { length: 255 }).notNull(),
  sku_engenharia: varchar('sku_engenharia', { length: 100 }),
  kerf_mm: integer('kerf_mm').default(3),
  materiais: jsonb('materiais').notNull(),       // Armazena ChapaMaterial[]
  resultado: jsonb('resultado'),                  // Armazena ResultadoOtimizacao
  observacoes: text('observacoes'),
  criado_em: timestamp('criado_em').defaultNow(),
  atualizado_em: timestamp('atualizado_em').defaultNow(),
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
