import { pgTable, uuid, varchar, timestamp, numeric, integer } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  asaasCustomerId: varchar('asaas_customer_id', { length: 255 }),
  asaasSubscriptionId: varchar('asaas_subscription_id', { length: 255 }),
  status: varchar('status', { length: 50 }).default('active').notNull(),
  plano: varchar('plano', { length: 50 }).default('free').notNull(),
  valor: numeric('valor', { precision: 12, scale: 2 }).default('0.00').notNull(),
  diaVencimento: integer('dia_vencimento'),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const usageLogs = pgTable('usage_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  usuarioId: uuid('usuario_id').notNull(),
  modelo: varchar('modelo', { length: 100 }).notNull(),
  promptTokens: integer('prompt_tokens').default(0).notNull(),
  completionTokens: integer('completion_tokens').default(0).notNull(),
  totalTokens: integer('total_tokens').default(0).notNull(),
  custoEstimado: numeric('custo_estimado', { precision: 15, scale: 8 }).default('0.00000000').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
