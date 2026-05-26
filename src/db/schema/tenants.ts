import { pgTable, uuid, varchar, timestamp, integer, numeric, text } from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  nome: varchar('nome', { length: 255 }).notNull(),
  subdominio: varchar('subdominio', { length: 100 }).unique(),
  planoTier: varchar('plano_tier', { length: 50 }).default('basic').notNull(),
  status: varchar('status', { length: 20 }).default('ativo').notNull(), // 'ativo', 'suspenso', 'inadimplente'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tenantConfigs = pgTable('tenant_configs', {
  tenantId: uuid('tenant_id').primaryKey().references(() => tenants.id, { onDelete: 'cascade' }),
  espessuraPadraoMdf: integer('espessura_padrao_mdf').default(15).notNull(),
  larguraMaximaSemTravessa: integer('largura_maxima_sem_travessa').default(800).notNull(),
  folgaGavetaTelescopica: numeric('folga_gaveta_telescopica', { precision: 4, scale: 2 }).default('13.00').notNull(),
  markupPadrao: numeric('markup_padrao', { precision: 5, scale: 2 }).default('1.50').notNull(),
  geminiApiKeyCustom: text('gemini_api_key_custom'), // Chave opcional encriptada do cliente
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
