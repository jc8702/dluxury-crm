import { pgTable, uuid, varchar, timestamp, decimal, integer, text } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants.js';

// --- GESTAO DE SKUs DE ENGENHARIA ---

export const skuEngenharia = pgTable('sku_engenharia', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
    codigo: varchar('codigo', { length: 20 }).unique().notNull(),
    nome: varchar('nome', { length: 200 }).notNull(),
    categoria: varchar('categoria', { length: 50 }),
    tipoProduto: varchar('tipo_produto', { length: 50 }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const skuMontagem = pgTable('sku_montagem', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
    codigo: varchar('codigo', { length: 20 }).unique().notNull(),
    nome: varchar('nome', { length: 200 }).notNull(),
    unidadeMedida: varchar('unidade_medida', { length: 10 }).default('UN'),
    tempoMontagemMin: integer('tempo_montagem_min'),
    complexidade: varchar('complexidade', { length: 20 }),
    createdAt: timestamp('created_at').defaultNow(),
});

export const skuComponente = pgTable('sku_componente', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
    codigo: varchar('codigo', { length: 20 }).unique().notNull(),
    nome: varchar('nome', { length: 200 }).notNull(),
    tipo: varchar('tipo', { length: 50 }),
    unidadeMedida: varchar('unidade_medida', { length: 10 }),
    dimensoes: text('dimensoes'),
    precoUnitario: decimal('preco_unitario', { precision: 10, scale: 2 }),
    estoqueAtual: decimal('estoque_atual', { precision: 10, scale: 3 }),
    createdAt: timestamp('created_at').defaultNow(),
});

// --- ESTRUTURA BOM (Bill of Materials) ---

export const bomEngenhariaMontagem = pgTable('bom_engenharia_montagem', {
    id: uuid('id').primaryKey().defaultRandom(),
    skuEngenhariaId: uuid('sku_engenharia_id').references(() => skuEngenharia.id, { onDelete: 'cascade' }),
    skuMontagemId: uuid('sku_montagem_id').references(() => skuMontagem.id),
    quantidade: decimal('quantidade', { precision: 10, scale: 3 }).notNull(),
    ordemProducao: integer('ordem_production'),
    observacoes: text('observacoes'),
});

export const bomMontagemComponente = pgTable('bom_montagem_componente', {
    id: uuid('id').primaryKey().defaultRandom(),
    skuMontagemId: uuid('sku_montagem_id').references(() => skuMontagem.id, { onDelete: 'cascade' }),
    skuComponenteId: uuid('sku_componente_id').references(() => skuComponente.id),
    quantidade: decimal('quantidade', { precision: 10, scale: 3 }).notNull(),
    perdaPercentual: decimal('perda_percentual', { precision: 5, scale: 2 }).default('5.00'),
    observacoes: text('observacoes'),
});

// --- RELACIONAMENTOS ---

export const skuEngenhariaRelations = relations(skuEngenharia, ({ many }) => ({
    montagens: many(bomEngenhariaMontagem),
}));

export const skuMontagemRelations = relations(skuMontagem, ({ many }) => ({
    engenharia: many(bomEngenhariaMontagem),
    componentes: many(bomMontagemComponente),
}));

export const bomEngenhariaMontagemRelations = relations(bomEngenhariaMontagem, ({ one }) => ({
    engenharia: one(skuEngenharia, { fields: [bomEngenhariaMontagem.skuEngenhariaId], references: [skuEngenharia.id] }),
    montagem: one(skuMontagem, { fields: [bomEngenhariaMontagem.skuMontagemId], references: [skuMontagem.id] }),
}));

export const bomMontagemComponenteRelations = relations(bomMontagemComponente, ({ one }) => ({
    montagem: one(skuMontagem, { fields: [bomMontagemComponente.skuMontagemId], references: [skuMontagem.id] }),
    componente: one(skuComponente, { fields: [bomMontagemComponente.skuComponenteId], references: [skuComponente.id] }),
}));
