import { logger } from '../logger';

export function requestLogger(req: any, res: any, next: any): void {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(2, 10);

  req.requestId = requestId;

  res.on('finish', () => {
    logger.info('Request completed', {
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: Date.now() - start,
      tenantId: req.tenantId,
      userId: req.tenantContext?.user?.id,
    });
  });

  next();
}
