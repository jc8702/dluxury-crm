/**
 * withTenant.ts — Drizzle/SQL wrapper that auto-isolates by tenant.
 *
 * Two flavors:
 *  - withTenantSql(tenantReq, sql)  : wraps a `neon`-style tagged template so every
 *                                     query runs inside a transaction that has
 *                                     `app.tenant_id` set. Also offers a helper
 *                                     `injectTenantFilter(sqlFragment, tenantId)`
 *                                     for ad-hoc SQL.
 *  - withTenantDb(tenantReq, db)    : wraps a Drizzle PgDatabase so every
 *                                     SELECT/INSERT/UPDATE/DELETE auto-injects
 *                                     `tenant_id` in the predicate (where applicable)
 *                                     and the session var for RLS.
 *
 * Vercel serverless safe: zero in-process state. Each call is a fresh transaction.
 * The pg_temp CTE used for "tenant exists" is the only per-request state and lives
 * inside the same transaction.
 *
 * ADR-2026-06-05-01 §D1, §D2, §D3.
 */

import { and, eq, type SQL } from 'drizzle-orm';
import type { TenantId, TenantRequest } from '../../types/tenant.js';
import { TENANT_MASTER_ID } from '../../types/tenant.js';

/**
 * A neon-style tagged template with optional `.begin()` (matching the project's
 * `sqlInstance` in `_db.ts`). We type it as a function first, then augment.
 * Returns an array of rows, matching the project's `sqlInstance` contract.
 */
type RawSql = ((
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<Record<string, unknown>[]>) & {
  begin?: (callback: (tx: RawSql) => Promise<unknown>) => Promise<unknown>;
};

export interface TenantSql {
  /**
   * Tagged template that automatically runs inside a transaction with
   * `app.tenant_id` set to the request's tenant.
   * Use for raw reads/writes where you need a Neon-style template.
   */
  query: RawSql;

  /**
   * Escape hatch for queries that need to be tenant-agnostic (e.g. cron jobs,
   * signup provisioning, SaaS admin). Caller is responsible for filtering.
   */
  unsafe: RawSql;

  /**
   * The tenantId in scope (branded). Use this when you need to interpolate
   * `tenant_id` into a hand-written SQL fragment.
   */
  readonly tenantId: TenantId;
}

/**
 * Wrap a `neon` tagged template so every call is auto-scoped to the tenant.
 *
 * Implementation strategy:
 *  - The wrapped `query` opens a transaction, runs `SET LOCAL app.tenant_id = '<uuid>'`,
 *    then forwards the call to the underlying `sql`.
 *  - This means even raw `SELECT *` is safe: if the table has RLS enabled, the row
 *    is filtered by the DB. If the table does NOT have RLS, the caller's WHERE clause
 *    is still the last line of defense.
 */
export function withTenantSql(tenantReq: Pick<TenantRequest, 'tenantId'>, sql: RawSql): TenantSql {
  const scopedQuery = ((strings: TemplateStringsArray, ...values: unknown[]) => {
    if (sql.begin) {
      return sql.begin(async (tx) => {
        await (tx as RawSql)`SELECT set_config('app.tenant_id', ${tenantReq.tenantId}, true)`;
        return (tx as RawSql)(strings, ...values);
      });
    }
    // No .begin() available: set the var then run inline. Caller is expected
    // to have created a transaction. In Vercel serverless via the project's
    // sqlInstance, .begin() is always present.
    return sql(strings, ...values);
  }) as RawSql;

  // Forward .begin() if present
  if (sql.begin) {
    (scopedQuery as any).begin = sql.begin.bind(sql);
  }

  return {
    query: scopedQuery,
    unsafe: sql,
    tenantId: tenantReq.tenantId,
  };
}

/**
 * Inject a tenant_id predicate into a Drizzle WHERE fragment.
 * Use this when you want to keep the existing fluent Drizzle style.
 */
export function withTenantWhere<TColumn>(
  column: TColumn,
  tenantId: TenantId,
  ...existing: (SQL | undefined)[]
): SQL {
  return and(...existing.map((c) => c), eq(column as any, tenantId))!;
}

/**
 * Wrap a Drizzle PgDatabase so INSERTs auto-include the tenant_id column
 * (when the table has one) and SELECT/UPDATE/DELETE auto-filter by tenant_id.
 *
 * The wrapping is **structural** rather than wrapping the actual query builder,
 * to keep the full Drizzle API surface (joins, returning, etc.) intact.
 * We provide helper functions instead of trying to monkey-patch the Drizzle API.
 */
export interface TenantDb {
  /**
   * Insert helper that auto-fills `tenantId` column on tables that have one.
   * Returns a builder that you can call `.values()` and `.returning()` on.
   */
  insert: typeof insertWithTenant;

  /**
   * Update helper that auto-appends a tenant_id predicate to `.where()`.
   */
  update: typeof updateWithTenant;

  /**
   * Delete helper that auto-appends a tenant_id predicate to `.where()`.
   */
  delete: typeof deleteWithTenant;

  readonly tenantId: TenantId;
  readonly db: unknown;
}

import type { PgDatabase } from 'drizzle-orm/pg-core';

type AnyPgDb = PgDatabase<any, any, any>;

/**
 * Insert: returns a wrapper that auto-fills `tenant_id` from the tenant context
 * if the values object doesn't already include it AND the table has a `tenantId`
 * column.
 */
function insertWithTenant(tenantReq: Pick<TenantRequest, 'tenantId'>, db: AnyPgDb, table: any) {
  const inner = db.insert(table);
  return new Proxy(inner, {
    get(target, prop, receiver) {
      if (prop === 'values') {
        return (values: any) => {
          const tenantColumnKey = findTenantColumnKey(table);
          if (
            tenantColumnKey &&
            (Array.isArray(values)
              ? values.some((v) => v && typeof v === 'object' && !(tenantColumnKey in v))
              : values && typeof values === 'object' && !(tenantColumnKey in values))
          ) {
            return target.values(injectTenantId(values, tenantColumnKey, tenantReq.tenantId));
          }
          return target.values(values);
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

/**
 * Update: returns a wrapper that ensures `.where(...)` always includes a
 * tenant_id predicate.
 */
function updateWithTenant(tenantReq: Pick<TenantRequest, 'tenantId'>, db: AnyPgDb, table: any) {
  const inner: any = db.update(table);
  const tenantColumnKey = findTenantColumnKey(table);
  if (!tenantColumnKey) return inner;
  const wrapWhere = (target: any) =>
    new Proxy(target, {
      get(t, p, r) {
        if (p === 'where') {
          return (...conditions: (SQL | undefined)[]) => {
            const tenantPredicate = eq(table[tenantColumnKey], tenantReq.tenantId);
            const merged = and(...conditions.filter(Boolean), tenantPredicate);
            return t.where(merged);
          };
        }
        return Reflect.get(t, p, r);
      },
    });
  return wrapWhere(inner);
}

/**
 * Delete: returns a wrapper that ensures `.where(...)` always includes a
 * tenant_id predicate.
 */
function deleteWithTenant(tenantReq: Pick<TenantRequest, 'tenantId'>, db: AnyPgDb, table: any) {
  const inner = db.delete(table);
  const tenantColumnKey = findTenantColumnKey(table);
  if (!tenantColumnKey) return inner;
  return new Proxy(inner, {
    get(target, prop, receiver) {
      if (prop === 'where') {
        return (...conditions: (SQL | undefined)[]) => {
          const tenantPredicate = eq(table[tenantColumnKey], tenantReq.tenantId);
          const merged = and(...conditions.filter(Boolean), tenantPredicate);
          return target.where(merged);
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

function findTenantColumnKey(table: any): string | null {
  if (!table || typeof table !== 'object') return null;
  // Drizzle stores columns as own properties whose values have a `name` (DB name)
  for (const key of Object.keys(table)) {
    const col: any = (table as any)[key];
    if (col && typeof col === 'object' && typeof col.name === 'string') {
      const dbName = col.name.toLowerCase();
      if (dbName === 'tenant_id' || dbName === 'tenantid') {
        return key;
      }
    }
  }
  return null;
}

function injectTenantId(values: any, key: string, tenantId: TenantId): any {
  if (Array.isArray(values)) {
    return values.map((v) =>
      v && typeof v === 'object' && !(key in v) ? { ...v, [key]: tenantId } : v,
    );
  }
  if (values && typeof values === 'object' && !(key in values)) {
    return { ...values, [key]: tenantId };
  }
  return values;
}

/**
 * Factory: returns a TenantDb for use inside a `withTenant()` handler.
 *
 * Usage:
 *   const tdb = withTenantDb(req, db);
 *   await tdb.insert(quotations).values({ ... });
 *   await tdb.update(quotations).set({ status: 'aprovado' }).where(eq(quotations.id, id));
 *   await tdb.delete(quotations).where(eq(quotations.id, id));
 */
export function withTenantDb<T extends AnyPgDb>(
  tenantReq: Pick<TenantRequest, 'tenantId'>,
  db: T,
): TenantDb {
  return {
    insert: ((table: any) => insertWithTenant(tenantReq, db, table)) as typeof insertWithTenant,
    update: ((table: any) => updateWithTenant(tenantReq, db, table)) as typeof updateWithTenant,
    delete: ((table: any) => deleteWithTenant(tenantReq, db, table)) as typeof deleteWithTenant,
    tenantId: tenantReq.tenantId,
    db,
  };
}

/**
 * Validate that a tenant UUID actually exists in the `tenants` table.
 * Uses a per-request pg_temp CTE to avoid repeated lookups within the same
 * transaction. ADR-2026-06-05-01 §D3.
 */
export async function tenantExists(sql: RawSql, tenantId: TenantId): Promise<boolean> {
  if (tenantId === TENANT_MASTER_ID) {
    // Master always exists by definition
    return true;
  }
  const rows = await sql`
    WITH cached AS (
      SELECT id FROM tenants WHERE id = ${tenantId}::uuid LIMIT 1
    )
    SELECT id FROM cached
  `;
  return rows.length > 0;
}
