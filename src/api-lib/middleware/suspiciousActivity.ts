/**
 * suspiciousActivity.ts — Structured logger for tenant isolation violations.
 *
 * Why a dedicated module:
 *  - All cross-tenant attempts must be observable in one place (Sentry tags).
 *  - Must NEVER log the JWT, password, or full request body (PII).
 *  - Must NEVER throw — logging must not break the request that triggered it.
 *
 * ADR-2026-06-05-01 §D5.
 */

import * as Sentry from '@sentry/node';
import type { TenantId } from '../../types/tenant.js';
import { logger } from '../logger.js';

export type SuspiciousReason =
  | 'MISSING_TENANT_CLAIM'
  | 'TENANT_NOT_FOUND'
  | 'TENANT_DOMAIN_MISMATCH'
  | 'CROSS_TENANT_WRITE_ATTEMPT'
  | 'CROSS_TENANT_READ_ATTEMPT'
  | 'RLS_VIOLATION'
  | 'INVALID_TENANT_ID_FORMAT';

export interface SuspiciousEvent {
  reason: SuspiciousReason;
  tenantId?: TenantId | string;
  userId?: string;
  route?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  extra?: Record<string, string | number | boolean>;
}

function getClientIp(req: any): string {
  const headers = req?.headers || {};
  return (
    headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    headers['x-real-ip'] ||
    req?.socket?.remoteAddress ||
    'unknown'
  );
}

/**
 * Record a suspicious activity event. Safe to call in any context — never throws.
 */
export function logSuspicious(event: SuspiciousEvent, req?: any): void {
  try {
    const enriched: SuspiciousEvent = {
      ...event,
      ip: event.ip ?? (req ? getClientIp(req) : undefined),
      userAgent: event.userAgent ?? (req?.headers?.['user-agent'] as string | undefined),
      route: event.route ?? req?.url,
      method: event.method ?? req?.method,
    };

    if (process.env.NODE_ENV !== 'production') {
      logger.error(
        '[suspicious]',
        JSON.stringify({
          tag: 'tenant_isolation_violation',
          ...enriched,
          timestamp: new Date().toISOString(),
        }),
      );
    }

    if (process.env.SENTRY_DSN) {
      Sentry.captureMessage('tenant_isolation_violation', {
        level: 'warning',
        tags: {
          reason: enriched.reason,
          tenant_id: enriched.tenantId || 'unknown',
          route: enriched.route || 'unknown',
          method: enriched.method || 'unknown',
        },
        extra: {
          userId: enriched.userId,
          ip: enriched.ip,
          userAgent: enriched.userAgent,
          ...(enriched.extra || {}),
        },
      });
    }
  } catch (loggingError) {
    try {
      logger.error('[suspicious-logger-failed]', String(loggingError));
    } catch {
      /* swallow */
    }
  }
}
