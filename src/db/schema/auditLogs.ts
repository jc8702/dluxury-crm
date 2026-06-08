import { pgTable, uuid, varchar, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants.js';

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id'),
  action: varchar('action', { length: 50 }).notNull(),
  tableName: varchar('table_name', { length: 100 }),
  recordId: uuid('record_id'),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow(),
  retentionExpiresAt: timestamp('retention_expires_at', { withTimezone: true }).default(
    sql`NOW() + INTERVAL '90 days'`,
  ),
});
