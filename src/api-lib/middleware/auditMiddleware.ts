import { logAudit } from '../services/auditLogService.js';
import { waitUntil } from '@vercel/functions';

function getClientIP(req: any): string {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (forwarded) {
    return (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '127.0.0.1';
}

function getUserAgent(req: any): string {
  const ua = req.headers?.['user-agent'];
  return Array.isArray(ua) ? ua[0] : ua || '';
}

function isMutation(method: string): boolean {
  return ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method);
}

function inferTableName(url: string): string {
  const parts = url.split('/').filter(Boolean);
  if (parts.length >= 2) {
    return parts[1];
  }
  return 'unknown';
}

function inferRecordId(body: any, url: string, method: string): string {
  if (method === 'POST' && body?.id) return body.id;
  if (method === 'PATCH' || method === 'PUT' || method === 'DELETE') {
    const parts = url.split('/').filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && /^[0-9a-fA-F-]{36}$/.test(last)) return last;
    if (body?.id) return body.id;
  }
  return '';
}

export function auditMiddleware(req: any, res: any, next: () => void): void {
  if (!isMutation(req.method)) {
    return next();
  }

  const originalJson = res.json.bind(res);
  const originalEnd = res.end.bind(res);
  const bodySnapshot = req.body ? { ...req.body } : {};

  const actionMap: Record<string, string> = {
    POST: 'CREATE',
    PATCH: 'UPDATE',
    PUT: 'UPDATE',
    DELETE: 'DELETE',
  };

  let audited = false;

  function runAudit(): Promise<void> | undefined {
    if (audited) return;
    audited = true;

    const tenantId = req.tenantId || req.tenantContext?.tenantId || req.user?.tenantId || '';
    const userId = req.tenantUser?.id || req.tenantContext?.user?.id || req.user?.id || '';
    const action = actionMap[req.method] || req.method;
    const tableName = inferTableName(req.url || '');
    const recordId = inferRecordId(bodySnapshot, req.url || '', req.method);

    if (!tenantId) return;

    const isDelete = action === 'DELETE';
    return logAudit({
      tenantId,
      userId,
      action,
      tableName,
      recordId,
      oldValues: isDelete ? bodySnapshot : {},
      newValues: isDelete ? {} : bodySnapshot,
      ipAddress: getClientIP(req),
      userAgent: getUserAgent(req),
    }).catch((err) => console.error('[auditMiddleware] async log error:', err));
  }

  const hasWaitUntil = typeof waitUntil === 'function';

  res.json = function (body: any) {
    const promise = runAudit();
    if (promise && hasWaitUntil) {
      waitUntil(promise);
      return originalJson(body);
    }
    if (promise) {
      return promise.then(() => originalJson(body));
    }
    return originalJson(body);
  };

  res.end = function (this: any, ...args: any[]) {
    const promise = runAudit();
    if (promise && hasWaitUntil) {
      waitUntil(promise);
      return originalEnd(...args);
    }
    if (promise) {
      return promise.then(() => originalEnd(...args));
    }
    return originalEnd(...args);
  };

  next();
}
