export const logger = {
  info: (message: string, context?: Record<string, any>) => {
    console.info(
      JSON.stringify({ level: 'INFO', message, context, timestamp: new Date().toISOString() }),
    );
  },
  warn: (message: string, context?: Record<string, any>) => {
    console.warn(
      JSON.stringify({ level: 'WARN', message, context, timestamp: new Date().toISOString() }),
    );
  },
  error: (message: string, error?: Error | unknown, context?: Record<string, any>) => {
    const errorDetails =
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : { raw: error };
    console.error(
      JSON.stringify({
        level: 'ERROR',
        message,
        error: errorDetails,
        context,
        timestamp: new Date().toISOString(),
      }),
    );
  },
};
