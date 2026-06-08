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

export interface AuditTrailParams {
  tenantId: string;
  tableName?: string;
  recordId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

const KNOWN_ACTIONS = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'MOVE_CARD',
  'SAVE_RESULT',
  'UPDATE_DETAILS',
] as const;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(s: string): boolean {
  return UUID_RE.test(s);
}

function isValidISODate(s: string): boolean {
  return ISO_DATE_RE.test(s) && !isNaN(Date.parse(s));
}

export interface WhereClauseResult {
  where: string;
  values: unknown[];
}

export function buildAuditWhereClause(params: AuditTrailParams): WhereClauseResult {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (!params.tenantId || !isValidUUID(params.tenantId)) {
    throw new Error(`Invalid or missing tenantId: ${params.tenantId}`);
  }

  conditions.push(`tenant_id = $${values.length + 1}::uuid`);
  values.push(params.tenantId);

  if (params.action) {
    if (!KNOWN_ACTIONS.includes(params.action as (typeof KNOWN_ACTIONS)[number])) {
      throw new Error(`Unknown action: ${params.action}`);
    }
    conditions.push(`action = $${values.length + 1}`);
    values.push(params.action);
  }

  if (params.tableName) {
    conditions.push(`table_name = $${values.length + 1}`);
    values.push(params.tableName);
  }

  if (params.recordId) {
    if (!isValidUUID(params.recordId)) {
      throw new Error(`Invalid recordId: ${params.recordId}`);
    }
    conditions.push(`record_id = $${values.length + 1}::uuid`);
    values.push(params.recordId);
  }

  if (params.startDate) {
    if (!isValidISODate(params.startDate)) {
      throw new Error(`Invalid startDate: ${params.startDate}`);
    }
    conditions.push(`created_at >= $${values.length + 1}::timestamptz`);
    values.push(params.startDate);
  }

  if (params.endDate) {
    if (!isValidISODate(params.endDate)) {
      throw new Error(`Invalid endDate: ${params.endDate}`);
    }
    conditions.push(`created_at <= $${values.length + 1}::timestamptz`);
    values.push(params.endDate);
  }

  return { where: conditions.join(' AND '), values };
}

export function clampPagination(
  limit: number | undefined,
  offset: number | undefined,
): { limit: number; offset: number } {
  const clampedLimit = Math.max(1, Math.min(limit ?? 50, 200));
  const clampedOffset = Math.max(0, offset ?? 0);
  return { limit: clampedLimit, offset: clampedOffset };
}

export async function getAuditTrail(params: AuditTrailParams): Promise<AuditEntry[]> {
  try {
    const { where, values } = buildAuditWhereClause(params);
    const { limit, offset: off } = clampPagination(params.limit, params.offset);

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
      WHERE ${where}
      ORDER BY created_at DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2};
    `;

    const allValues = [...values, limit, off];
    const rows = await sql.query(query, allValues);
    return rows.rows || rows;
  } catch (error: any) {
    console.error('[auditLogService] Erro ao consultar auditoria:', error.message);
    return [];
  }
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
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
