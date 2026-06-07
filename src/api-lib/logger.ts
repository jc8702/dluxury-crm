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

export const logger = {
  info: (message: string, meta?: Record<string, any>) => log({ level: 'info', message, ...meta }),
  warn: (message: string, meta?: Record<string, any>) => log({ level: 'warn', message, ...meta }),
  error: (message: string, meta?: Record<string, any>) => log({ level: 'error', message, ...meta }),
  debug: (message: string, meta?: Record<string, any>) => {
    if (process.env.NODE_ENV !== 'production') log({ level: 'debug', message, ...meta });
  },
};
