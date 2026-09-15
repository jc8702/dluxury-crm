type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  tenantId?: string;
  userId?: string;
  requestId?: string;
  duration?: number;
  [key: string]: any;
}

function log(entry: LogEntry): void {
  const output = {
    ...entry,
    timestamp: new Date().toISOString(),
    service: 'dluxury-crm',
    env: process.env.VERCEL_ENV || 'development',
  };

  const method =
    entry.level === 'error' ? console.error : entry.level === 'warn' ? console.warn : console.log;

  method(JSON.stringify(output));
}

// Normaliza o segundo argumento (meta) antes de espalhar em log().
// Sem isso: uma string vira {0:'a',1:'b',...} (spread de string) e um Error vira {}
// (propriedades como message/stack não são enumeráveis), perdendo a informação real
// do erro silenciosamente — os 49 call-sites de logger.error(msg, err) no código
// dependiam disso funcionar e nunca funcionou de verdade.
function normalizeMeta(meta: unknown): Record<string, any> | undefined {
  if (meta === undefined || meta === null) return undefined;
  if (meta instanceof Error) {
    return { error: meta.message, stack: meta.stack, name: meta.name };
  }
  if (typeof meta === 'string') {
    return { detail: meta };
  }
  if (typeof meta === 'object' && !Array.isArray(meta)) {
    return meta as Record<string, any>;
  }
  return { detail: String(meta) };
}

export const logger = {
  info: (message: string, meta?: unknown) =>
    log({ level: 'info', message, ...normalizeMeta(meta) }),
  warn: (message: string, meta?: unknown) =>
    log({ level: 'warn', message, ...normalizeMeta(meta) }),
  error: (message: string, meta?: unknown) =>
    log({ level: 'error', message, ...normalizeMeta(meta) }),
  debug: (message: string, meta?: unknown) => {
    if (process.env.NODE_ENV !== 'production')
      log({ level: 'debug', message, ...normalizeMeta(meta) });
  },
};
