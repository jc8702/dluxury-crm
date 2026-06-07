import { sql } from '../_db.js';

export interface AuditEntry {
  tenantId: string;
  userId?: string;
  action: string;
  tableName: string;
  recordId: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const isValidUUID = (id: string | undefined) =>
      id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const safeRecordId = isValidUUID(entry.recordId) ? entry.recordId : null;
    const safeUserId = isValidUUID(entry.userId) ? entry.userId : null;
    const safeTenantId = isValidUUID(entry.tenantId) ? entry.tenantId : null;

    if (!safeTenantId) {
      console.warn('[auditLogService] Auditoria ignorada: tenantId ausente ou inválido', entry);
      return;
    }

    await sql`
      INSERT INTO audit_logs (
        tenant_id, user_id, action, table_name, record_id,
        data_before, data_after, ip_address, user_agent,
        retention_expires_at
      ) VALUES (
        ${safeTenantId}::uuid, ${safeUserId ? safeUserId : null}::uuid, ${entry.action},
        ${entry.tableName}, ${safeRecordId ? safeRecordId : null}::uuid,
        ${JSON.stringify(entry.oldValues || {})}::jsonb,
        ${JSON.stringify(entry.newValues || {})}::jsonb,
        ${entry.ipAddress || null}, ${entry.userAgent || null},
        CURRENT_TIMESTAMP + INTERVAL '90 days'
      );
    `;
  } catch (error: any) {
    console.error('[auditLogService] Erro ao registrar auditoria:', error.message);
  }
}

export async function getAuditTrail(params: {
  tenantId: string;
  tableName?: string;
  recordId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}): Promise<AuditEntry[]> {
  const conditions: string[] = [];
  const values: any[] = [];

  conditions.push(`tenant_id = $${values.length + 1}::uuid`);
  values.push(params.tenantId);

  if (params.tableName) {
    conditions.push(`table_name = $${values.length + 1}`);
    values.push(params.tableName);
  }
  if (params.recordId) {
    conditions.push(`record_id = $${values.length + 1}::uuid`);
    values.push(params.recordId);
  }
  if (params.action) {
    conditions.push(`action = $${values.length + 1}`);
    values.push(params.action);
  }
  if (params.startDate) {
    conditions.push(`created_at >= $${values.length + 1}::timestamptz`);
    values.push(params.startDate);
  }
  if (params.endDate) {
    conditions.push(`created_at <= $${values.length + 1}::timestamptz`);
    values.push(params.endDate);
  }

  const limit = Math.min(params.limit || 50, 200);
  const offset = params.offset || 0;

  const query = `
    SELECT
      tenant_id::text AS "tenantId",
      user_id AS "userId",
      action,
      table_name AS "tableName",
      record_id::text AS "recordId",
      data_before AS "oldValues",
      data_after AS "newValues",
      ip_address AS "ipAddress",
      user_agent AS "userAgent",
      created_at AS "createdAt"
    FROM audit_logs
    WHERE ${conditions.join(' AND ')}
    ORDER BY created_at DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2};
  `;

  values.push(limit, offset);

  try {
    const rows = await sql.query(query, values);
    return rows.rows || rows;
  } catch (error: any) {
    console.error('[auditLogService] Erro ao consultar auditoria:', error.message);
    return [];
  }
}
