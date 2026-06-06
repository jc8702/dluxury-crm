/**
 * tenantMiddleware.ts — Higher-order function that wraps every authenticated
 * route handler with strict tenant isolation.
 *
 * Pipeline:
 *   1. Extract Bearer token from `Authorization` header.
 *   2. Verify JWT (HS256, APP_JWT_SECRET).
 *   3. Extract `tenantId` claim.
 *   4. Validate that the tenant exists in the `tenants` table.
 *   5. (Optional) Cross-check that the resolved domain's tenant matches the JWT claim.
 *   6. Inject `req.tenantId` (branded) + `req.tenantUser` + `req.tenantSubdomain` + `req.planoTier`.
 *   7. Call the wrapped handler.
 *   8. Any failure short-circuits with 401/403 + a structured JSON error.
 *
 * Feature flag:
 *   - `NEW_TENANT_MIDDLEWARE=false` (env var) → legacy `validateAuth` path is used.
 *   - Default: enabled.
 *
 * ADR-2026-06-05-01 §D1, §D6.
 */

import jwt from 'jsonwebtoken';
import {
  asTenantId,
  isTenantId,
  TENANT_MASTER_ID,
  type JwtPayload,
  type TenantRequest,
  type UserRole,
  type PlanoTier,
} from '../../types/tenant.js';
import { logSuspicious, type SuspiciousReason } from './suspiciousActivity.js';
import { tenantExists } from '../db/withTenant.js';
import { resolveTenantByDomain, sql } from '../_db.js';

const JWT_SECRET = process.env.APP_JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('APP_JWT_SECRET environment variable is required');
}

export interface TenantMiddlewareOptions {
  /**
   * If true, the middleware also enforces that `req.tenantFromDomain`
   * (resolved by `resolveTenantByDomain`) matches the JWT's tenant claim.
   * Use this on multi-tenant routes that should be locked to the domain.
   * Default: false.
   */
  enforceDomainMatch?: boolean;

  /**
   * Allow master tenant to bypass certain checks (SaaS admin operations).
   * Default: false.
   */
  allowMasterAdmin?: boolean;

  /**
   * List of role values that the JWT must contain.
   * If empty, no role check is performed.
   */
  requireRoles?: UserRole[];
}

interface RequestLike {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: any;
  query?: any;
  tenantFromDomain?: { id: string; nome?: string; subdominio?: string | null } | null;
}

interface ResponseLike {
  status(code: number): ResponseLike;
  json(body: unknown): unknown;
  end(): unknown;
}

export type TenantHandler = (
  req: RequestLike & TenantRequest,
  res: ResponseLike,
) => Promise<unknown> | unknown;

function sendError(res: ResponseLike, status: number, error: string): unknown {
  return res.status(status).json({ success: false, error });
}

function isMiddlewareEnabled(): boolean {
  const flag = process.env.NEW_TENANT_MIDDLEWARE;
  // Default ON; opt-out via "false"
  return flag !== 'false';
}

function extractBearer(req: RequestLike): string | null {
  const header = req.headers['authorization'];
  if (!header) return null;
  const value = Array.isArray(header) ? header[0] : header;
  if (!value || !value.startsWith('Bearer ')) return null;
  return value.slice('Bearer '.length).trim() || null;
}

interface VerifyResult {
  ok: boolean;
  payload?: JwtPayload;
  reason?:
    | 'MISSING_TOKEN'
    | 'INVALID_TOKEN'
    | 'EXPIRED_TOKEN'
    | 'MISSING_TENANT_CLAIM'
    | 'INVALID_TENANT_CLAIM';
}

function verifyToken(token: string): VerifyResult {
  try {
    const decoded = jwt.verify(token, JWT_SECRET!, { algorithms: ['HS256'] });
    if (typeof decoded !== 'object' || decoded === null) {
      return { ok: false, reason: 'INVALID_TOKEN' };
    }
    const payload = decoded as JwtPayload;
    if (!payload.tenantId) {
      return { ok: false, payload, reason: 'MISSING_TENANT_CLAIM' };
    }
    if (!isTenantId(payload.tenantId)) {
      return { ok: false, payload, reason: 'INVALID_TENANT_CLAIM' };
    }
    return { ok: true, payload };
  } catch (err: any) {
    if (err?.name === 'TokenExpiredError') {
      return { ok: false, reason: 'EXPIRED_TOKEN' };
    }
    return { ok: false, reason: 'INVALID_TOKEN' };
  }
}

function reasonToStatus(
  reason: VerifyResult['reason'] | 'TENANT_NOT_FOUND' | 'TENANT_DOMAIN_MISMATCH' | 'ROLE_DENIED',
): {
  status: number;
  error: string;
} {
  switch (reason) {
    case 'MISSING_TOKEN':
    case 'INVALID_TOKEN':
    case 'EXPIRED_TOKEN':
      return { status: 401, error: 'Sessão inválida ou expirada. Faça login novamente.' };
    case 'MISSING_TENANT_CLAIM':
    case 'INVALID_TENANT_CLAIM':
    case 'TENANT_NOT_FOUND':
      return { status: 403, error: 'Tenant inválido ou não autorizado.' };
    case 'TENANT_DOMAIN_MISMATCH':
      return { status: 403, error: 'Token não corresponde ao domínio acessado.' };
    case 'ROLE_DENIED':
      return { status: 403, error: 'Permissão insuficiente para esta operação.' };
    default:
      return { status: 500, error: 'Erro interno de autenticação.' };
  }
}

/**
 * Wrap a route handler with strict tenant isolation.
 *
 *   export default withTenant(async (req, res) => {
 *     const { tenantId, tenantUser } = req; // branded, validated
 *     const rows = await sql`SELECT * FROM clientes WHERE id = ${id}`;
 *     return res.json({ success: true, data: rows });
 *   });
 */
export function withTenant(
  handler: TenantHandler,
  options: TenantMiddlewareOptions = {},
): (req: RequestLike, res: ResponseLike) => Promise<unknown> {
  return async (req, res) => {
    // 1. Extract token
    const token = extractBearer(req);
    if (!token) {
      logSuspicious({ reason: 'MISSING_TENANT_CLAIM' }, req);
      const { status, error } = reasonToStatus('MISSING_TOKEN');
      return sendError(res, status, error);
    }

    // 2. Verify JWT
    const verify = verifyToken(token);
    if (!verify.ok || !verify.payload) {
      const reason = verify.reason as SuspiciousReason;
      if (reason) {
        logSuspicious({ reason: reason as unknown as SuspiciousReason }, req);
      }
      const { status, error } = reasonToStatus(verify.reason);
      return sendError(res, status, error);
    }

    const payload = verify.payload;
    const tenantId = asTenantId(payload.tenantId);

    // 3. Validate tenant exists (uses pg_temp CTE, per-request cache)
    const exists = await tenantExists(sql as any, tenantId);
    if (!exists) {
      logSuspicious(
        {
          reason: 'TENANT_NOT_FOUND',
          tenantId,
          userId: payload.id,
        },
        req,
      );
      const { status, error } = reasonToStatus('TENANT_NOT_FOUND');
      return sendError(res, status, error);
    }

    // 4. (Optional) Cross-check with domain
    if (options.enforceDomainMatch) {
      const host = (req.headers['host'] as string) || '';
      const fromDomain = await resolveTenantByDomain(host);
      if (fromDomain && fromDomain.id !== tenantId) {
        logSuspicious(
          {
            reason: 'TENANT_DOMAIN_MISMATCH',
            tenantId,
            userId: payload.id,
            extra: { resolvedFromHost: fromDomain.id },
          },
          req,
        );
        const { status, error } = reasonToStatus('TENANT_DOMAIN_MISMATCH');
        return sendError(res, status, error);
      }
    }

    // 5. Role check
    if (options.requireRoles && options.requireRoles.length > 0) {
      if (!options.requireRoles.includes(payload.role)) {
        logSuspicious(
          {
            reason: 'CROSS_TENANT_READ_ATTEMPT',
            tenantId,
            userId: payload.id,
            extra: { role: payload.role, required: options.requireRoles.join(',') },
          },
          req,
        );
        const { status, error } = reasonToStatus('ROLE_DENIED');
        return sendError(res, status, error);
      }
    }

    // 6. Master admin bypass
    const isMasterAdmin = tenantId === TENANT_MASTER_ID;

    // 7. Inject tenant context into req
    const augmented = Object.assign(req, {
      tenantId,
      tenantUser: {
        id: payload.id,
        email: payload.email,
        role: payload.role,
        name: payload.name,
      },
      tenantSubdomain: payload.subdominio || '',
      planoTier: (payload.planoTier || 'basic') as PlanoTier,
      isMasterAdmin,
    } satisfies TenantRequest);

    // 8. Hand off
    return await handler(augmented, res);
  };
}

/**
 * Standalone resolver for code paths that need the TenantRequest object
 * (e.g. inside cron jobs, agent scripts) without going through withTenant.
 */
export async function resolveTenantRequest(
  req: RequestLike,
  options: TenantMiddlewareOptions = {},
): Promise<
  { ok: true; req: RequestLike & TenantRequest } | { ok: false; status: number; error: string }
> {
  const token = extractBearer(req);
  if (!token) {
    return { ok: false, ...reasonToStatus('MISSING_TOKEN') };
  }
  const verify = verifyToken(token);
  if (!verify.ok || !verify.payload) {
    return { ok: false, ...reasonToStatus(verify.reason) };
  }
  const payload = verify.payload;
  const tenantId = asTenantId(payload.tenantId);
  const exists = await tenantExists(sql as any, tenantId);
  if (!exists) {
    return { ok: false, ...reasonToStatus('TENANT_NOT_FOUND') };
  }
  if (options.requireRoles && options.requireRoles.length > 0) {
    if (!options.requireRoles.includes(payload.role)) {
      return { ok: false, ...reasonToStatus('ROLE_DENIED') };
    }
  }
  const augmented = Object.assign(req, {
    tenantId,
    tenantUser: {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      name: payload.name,
    },
    tenantSubdomain: payload.subdominio || '',
    planoTier: (payload.planoTier || 'basic') as PlanoTier,
    isMasterAdmin: tenantId === TENANT_MASTER_ID,
  } satisfies TenantRequest);
  return { ok: true, req: augmented };
}

export { isMiddlewareEnabled };
