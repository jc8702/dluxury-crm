import { RateLimiterMemory } from 'rate-limiter-flexible';
import { RATE_LIMITS } from '../config/rateLimits.js';

const limiters = {
  login: new RateLimiterMemory(RATE_LIMITS.login),
  api: new RateLimiterMemory(RATE_LIMITS.api),
  search: new RateLimiterMemory(RATE_LIMITS.search),
  export: new RateLimiterMemory(RATE_LIMITS.export),
  passwordReset: new RateLimiterMemory(RATE_LIMITS.passwordReset),
};

type LimiterType = keyof typeof limiters;

function getClientIP(req: any): string {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (forwarded) {
    return (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '127.0.0.1';
}

export async function applyRateLimit(
  type: LimiterType,
  identifier: string,
  res: any,
): Promise<boolean> {
  try {
    await limiters[type].consume(identifier);
    return true;
  } catch (error: any) {
    const retryAfter = Math.ceil(error.msBeforeNext / 1000) || 60;
    res.setHeader('Retry-After', retryAfter);
    res.status(429).json({
      error: 'Muitas requisições. Tente novamente em breve.',
      retryAfter,
    });
    return false;
  }
}

export async function loginRateLimit(req: any, res: any): Promise<boolean> {
  const identifier = getClientIP(req) || 'unknown';
  return await applyRateLimit('login', identifier, res);
}
