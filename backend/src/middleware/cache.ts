import type { Request, Response, NextFunction } from 'express';
import { getRedis } from '../config/redis';

export type CacheOptions = {
  ttlSeconds?: number;
  keyPrefix?: string;
  varyByUser?: boolean; // include user id if present on req
};

function defaultKeyBuilder(req: Request, opts: CacheOptions): string {
  const base = `${req.method}:${req.originalUrl}`;
  const userId = (req as any).user?.id || (req as any).auth?.userId;
  const vary = opts.varyByUser && userId ? `:u=${userId}` : '';
  return `${opts.keyPrefix || 'cache'}:${base}${vary}`;
}

export function cacheMiddleware(options?: CacheOptions) {
  const opts: Required<CacheOptions> = {
    ttlSeconds: options?.ttlSeconds ?? 60,
    keyPrefix: options?.keyPrefix ?? 'cache',
    varyByUser: options?.varyByUser ?? false,
  };
  const redis = getRedis();

  return async function cache(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.method !== 'GET') return next();
      if (!req.originalUrl.startsWith('/api')) return next();

      const key = defaultKeyBuilder(req, opts);
      const cached = await redis.get(key);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('Cache-Control', `public, max-age=${opts.ttlSeconds}`);
        return res.status(200).json(JSON.parse(cached));
      }

      const originalJson = res.json.bind(res);
      res.json = (body?: any) => {
        try {
          // do not cache error responses
          if (res.statusCode >= 200 && res.statusCode < 300) {
            redis.setex(key, opts.ttlSeconds, JSON.stringify(body)).catch(() => {});
            res.setHeader('X-Cache', 'MISS');
            res.setHeader('Cache-Control', `public, max-age=${opts.ttlSeconds}`);
          }
        } catch {}
        return originalJson(body);
      };

      next();
    } catch (e) {
      // On any failure, proceed without cache
      next();
    }
  };
}
