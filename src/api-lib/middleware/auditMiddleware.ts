import { logAudit } from '../services/auditLogService.js';

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
  const bodySnapshot = req.body ? { ...req.body } : {};

  // LIMITAÇÃO SERVERLESS (Vercel/AWS Lambda):
  // Interceptar res.json dispara a auditoria de forma assíncrona (fire-and-forget).
  // Em ambientes serverless agressivos, o processo pode congelar imediatamente após
  // o envio da resposta (originalJson), cancelando a inserção no banco de dados.
  // Idealmente, a auditoria deveria ser chamada explicitamente usando um `waitUntil`
  // ou inserida sequencialmente no fluxo de cada handler antes do res.json.
  // Para evitar bloquear a resposta do usuário, mantemos assíncrono.
  res.json = function (body: any) {
    const tenantId = req.tenantId || req.tenantContext?.tenantId || req.user?.tenantId || '';

    const userId = req.tenantUser?.id || req.tenantContext?.user?.id || req.user?.id || '';

    const actionMap: Record<string, string> = {
      POST: 'CREATE',
      PATCH: 'UPDATE',
      PUT: 'UPDATE',
      DELETE: 'DELETE',
    };

    const action = actionMap[req.method] || req.method;
    const tableName = inferTableName(req.url || '');
    const recordId = inferRecordId(bodySnapshot, req.url || '', req.method);

    if (tenantId && action !== 'DELETE') {
      logAudit({
        tenantId,
        userId,
        action,
        tableName,
        recordId,
        oldValues: {},
        newValues: bodySnapshot,
        ipAddress: getClientIP(req),
        userAgent: getUserAgent(req),
      }).catch((err) => console.error('[auditMiddleware] async log error:', err));
    }

    if (action === 'DELETE' && tenantId) {
      logAudit({
        tenantId,
        userId,
        action,
        tableName,
        recordId,
        oldValues: bodySnapshot,
        newValues: {},
        ipAddress: getClientIP(req),
        userAgent: getUserAgent(req),
      }).catch((err) => console.error('[auditMiddleware] async log error:', err));
    }

    return originalJson(body);
  };

  next();
}
