# ADR-2026-06-05-01: Tenant Isolation Middleware + DB Hardening

**Status:** Accepted  
**Date:** 2026-06-05  
**Branch:** `audit/2026-06-05-tenant-db`  
**Deciders:** Engineering Lead

---

## Context

The D'Luxury CRM has been operating as a single-tenant prototype. The codebase has 78+ tables, of which 20+ lack a `tenant_id` column. The existing tenant isolation is enforced application-side via a hard-coded fallback `tenantId = user?.tenantId || '00000000-0000-0000-0000-000000000000'`. This means a JWT without `tenantId` silently operates on the master tenant's data — a LGPD blocker.

The audit on 2026-06-05 also surfaced 8 documentation contradictions (E1–E8) that block any UI/DB standardization work.

## Decisions

### D1. Tenant middleware architecture

- A new `withTenant(handler)` HOF wraps every authenticated route handler.
- The middleware extracts the JWT, validates `tenantId` against the `tenants` table (cached per-request in a `pg_temp` CTE), and injects `req.tenantId` (branded `TenantId`) + `req.tenantUser`.
- A `withTenantDb(db, req)` factory wraps the Drizzle client so every query is auto-filtered by `tenant_id`.
- 401 (missing/invalid JWT) and 403 (missing/invalid/foreign `tenantId`) are returned by the middleware — no handler can be reached without a valid tenant context.

### D2. Defense in depth — Row Level Security

- PostgreSQL RLS is enabled on 7 critical tables: `titulos_receber`, `titulos_pagar`, `baixas`, `quotations`, `quotation_items`, `ordens_prod`, `materiais`.
- The middleware emits `SET LOCAL app.tenant_id = '<uuid>'` per transaction.
- If the middleware is bypassed (e.g. an admin script), the DB refuses cross-tenant reads/writes.

### D3. Cache for "tenant exists" validation

- **Neon `pg_temp` per-request CTE.** Zero state between requests. Zero dependency on Cloudflare KV.
- Trade-off: 1 extra query per authenticated request. Acceptable for Vercel serverless (no warm-cache benefit anyway).

### D4. Backfill strategy for legacy data

- For all `tenant_id`-less tables, the migration sets `tenant_id = '00000000-0000-0000-0000-000000000000'` (master tenant).
- This is a known dilution but is reversible and documented. Future imports will be tenant-aware.

### D5. Suspicious activity logging

- Sentry `captureMessage('tenant_isolation_violation', 'warning')` with tags `{ tenantId, userId, route, ip }`.
- No JWT or password is logged. No raw request body.
- Console.error fallback in dev environments.

### D6. Feature flag for safe rollout

- `NEW_TENANT_MIDDLEWARE=true` (Vercel env var) enables the new middleware in production.
- Default: enabled. To roll back: unset the env var or set to `false`.

### D7. Documentation contradictions (E1–E8)

| #   | Resolution                                                                                                                                   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | Primary color: **Laranja D'Luxury `#E2AC00`** (HSL `22 95% 50%`). README.md needs sync in a follow-up.                                       |
| E2  | AuthBypass: **removed in production;** dev-only via `import.meta.env.DEV && VITE_AUTH_BYPASS=true`.                                          |
| E3  | Canonical docs: `docs/design-system.md` (TBD), `docs/quickstart.md`, `ARCHITECTURE.md`, `README.md`. All other `.md` are RELATÓRIO or PLANO. |
| E4  | Coverage target: 80% stmts/lines. Branches/funcs = continuous improvement.                                                                   |
| E5  | `capitalize` rule moves to `docs/design-system.md` (TBD).                                                                                    |
| E6  | `drizzle/schema.ts` is auto-generated; will be renamed `drizzle/schema.ts.generated` and `.gitignore`d.                                      |
| E7  | Rate limits centralized in `src/config/rateLimits.ts` (TBD).                                                                                 |
| E8  | Seed admin: `admin@dluxury.com / Dluxury@2026` (rotated after first deploy).                                                                 |

## Consequences

### Positive

- LGPD compliance: cross-tenant reads are impossible even if the app has a bug.
- Reduced boilerplate: 45 handlers no longer need manual `validateAuth` + `tenantId` extraction.
- Clear ownership: any new handler MUST use `withTenant` to be authenticated.

### Negative

- One extra DB round-trip per authenticated request for the "tenant exists" check (mitigated by `pg_temp` CTE).
- RLS policies must be kept in sync with new tables — a follow-up enforcement rule will be added.
- 78 existing tables; full audit + column-add is a large migration footprint.

## Rollback

1. Set `NEW_TENANT_MIDDLEWARE=false` in Vercel.
2. The legacy code path (`validateAuth` + manual `tenantId` filter) is preserved as a fallback.
3. RLS can be disabled with `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` per table.

## References

- Audit report: `RELATORIO_AUDITORIA.md` (root), generated 2026-06-05.
- Source-of-truth schema: `src/db/schema/*` (Drizzle).
- Existing JWT verification: `src/api-lib/_db.ts:56-84`.
