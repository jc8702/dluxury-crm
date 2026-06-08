import { pgTable, uuid, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants.js';

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id'),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  action: text('action').notNull(),
  tableName: text('table_name'),
  recordId: text('record_id'),
  dataBefore: jsonb('data_before'),
  dataAfter: jsonb('data_after'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  retentionExpiresAt: timestamp('retention_expires_at', { withTimezone: true }).default(
    sql`CURRENT_TIMESTAMP + INTERVAL '90 days'`,
  ),
});
