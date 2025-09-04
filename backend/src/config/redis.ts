// Dynamic require of ioredis with a safe in-memory fallback to avoid compile/runtime errors
type RedisLike = {
  get(key: string): Promise<string | null>;
  setex(key: string, ttl: number, value: string): Promise<any>;
  ping(): Promise<string>;
  duplicate(): RedisLike;
  on(event: string, cb: (...args: any[]) => void): void;
};

let RedisCtor: any = null;
try { RedisCtor = require('ioredis'); } catch { RedisCtor = null; }

const REDIS_URL = process.env.REDIS_URL || undefined;
// Note: to avoid accidental localhost connection attempts, we only use real Redis when REDIS_URL is provided.
// Host/port variables are ignored unless REDIS_URL is explicitly set.
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_DB = parseInt(process.env.REDIS_DB || '0', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

let redis: RedisLike | null = null;

function createMemoryRedis(): RedisLike {
  const store = new Map<string, { v: string; exp: number }>();
  const now = () => Date.now();
  const api: RedisLike = {
    async get(key: string) {
      const e = store.get(key);
      if (!e) return null;
      if (e.exp && e.exp < now()) { store.delete(key); return null; }
      return e.v;
    },
    async setex(key: string, ttl: number, value: string) {
      const exp = now() + ttl * 1000;
      store.set(key, { v: value, exp });
      return 'OK' as any;
    },
    async ping() { return 'PONG'; },
    duplicate() { return api; },
    on(_event: string, _cb: (...args: any[]) => void) { /* no-op */ },
  };
  try { console.warn('[redis] ioredis not found; using in-memory fallback (non-persistent)'); } catch {}
  return api;
}

export function getRedis(): RedisLike {
  if (!redis) {
    if (RedisCtor && REDIS_URL) {
      // Real ioredis client only when REDIS_URL is provided
      const IORedis = RedisCtor;
      redis = new IORedis(REDIS_URL, { maxRetriesPerRequest: null, enableReadyCheck: true });
      try { (redis as any).on('connect', () => console.log('[redis] connected')); } catch {}
      try { (redis as any).on('error', (e: any) => console.error('[redis] error', e?.message || e)); } catch {}
    } else {
      // Fallback in-memory implementation
      redis = createMemoryRedis();
    }
  }
  return redis as RedisLike;
}

export async function redisPing(): Promise<boolean> {
  try {
    const r = await getRedis().ping();
    return r === 'PONG';
  } catch {
    return false;
  }
}

export function isRealRedis(): boolean {
  // Real Redis only when ioredis module is available and REDIS_URL is explicitly provided
  return !!(RedisCtor && REDIS_URL);
}
