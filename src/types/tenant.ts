/**
 * Tenant types — branded primitives + request augmentation.
 *
 * ADR-2026-06-05-01: Every authenticated request MUST carry a TenantId.
 * The branded type makes it impossible to pass a raw string where a TenantId is expected,
 * which prevents accidental cross-tenant queries.
 */

export type TenantId = string & { readonly __brand: 'TenantId' };

export const TENANT_MASTER_ID: TenantId = '00000000-0000-0000-0000-000000000000' as TenantId;

export type UserRole = 'admin' | 'user' | 'vendedor' | 'marceneiro' | 'master';
export type PlanoTier = 'basic' | 'pro' | 'enterprise';

export interface TenantUser {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
}

export interface TenantContext {
  tenantId: TenantId;
  tenantUser: TenantUser;
  tenantSubdomain: string;
  planoTier: PlanoTier;
  isMasterAdmin: boolean;
}

export interface TenantRequest {
  tenantId: TenantId;
  tenantUser: TenantUser;
  tenantSubdomain: string;
  planoTier: PlanoTier;
  isMasterAdmin: boolean;
}

export interface TenantResolutionResult {
  ok: boolean;
  tenantId?: TenantId;
  user?: TenantUser;
  subdomain?: string;
  planoTier?: PlanoTier;
  reason?:
    | 'MISSING_TOKEN'
    | 'INVALID_TOKEN'
    | 'EXPIRED_TOKEN'
    | 'MISSING_TENANT_CLAIM'
    | 'TENANT_NOT_FOUND'
    | 'TENANT_DOMAIN_MISMATCH'
    | 'INVALID_USER';
}

export interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
  tenantId: string;
  planoTier?: PlanoTier;
  subdominio?: string;
  iat?: number;
  exp?: number;
}

export function isTenantId(value: unknown): value is TenantId {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

export function asTenantId(value: string): TenantId {
  if (!isTenantId(value)) {
    throw new Error(`Invalid TenantId: ${value}`);
  }
  return value;
}
