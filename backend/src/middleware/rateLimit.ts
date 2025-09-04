import type { Request, Response, NextFunction } from 'express';
import { getRedis } from '../config/redis';
import { isRealRedis } from '../config/redis';

let RateLimiterRedisCtor: any = null;
try { RateLimiterRedisCtor = require('rate-limiter-flexible').RateLimiterRedis; } catch { RateLimiterRedisCtor = null; }

export function createRateLimiter(options?: {
  points?: number; // Number of points
  duration?: number; // Per second(s)
  blockDuration?: number; // Block for N seconds if consumed more than points
  keyPrefix?: string;
}) {
  // Only enable if the package is available and a real Redis is configured
  if (!RateLimiterRedisCtor || !isRealRedis()) {
    // No-op middleware if package is unavailable or redis is not real
    return async function rateLimitBypass(_req: Request, _res: Response, next: NextFunction) { return next(); };
  }

  const redis = getRedis();
  const limiter = new RateLimiterRedisCtor({
    storeClient: redis as any,
    points: options?.points ?? 100,
    duration: options?.duration ?? 60, // 100 requests per minute by default
    blockDuration: options?.blockDuration ?? 60,
    keyPrefix: options?.keyPrefix ?? 'rlflx',
  });

  return async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
      const key = `${req.ip}:${req.method}:${req.baseUrl || ''}`;
      await limiter.consume(key, 1);
      return next();
    } catch (rlRes: any) {
      // If rlRes contains msBeforeNext we were actually rate-limited; otherwise it's likely a store/redis error. Be graceful.
      const hasLimitInfo = rlRes && typeof rlRes.msBeforeNext === 'number';
      if (!hasLimitInfo) {
        // Bypass limiter on store errors to keep API available
        return next();
      }
      const retrySecs = Math.max(1, Math.round((rlRes.msBeforeNext || 0) / 1000));
      res.setHeader('Retry-After', String(retrySecs));
      return res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.',
          retryAfterSeconds: retrySecs,
        },
      });
    }
  };
}

export const defaultRateLimit = createRateLimiter();
