import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Distributed rate limiter backed by Upstash Redis.
//
// The previous in-memory limiter reset on every serverless cold start, so an
// attacker could time their abuse around deploys (or just hit different Vercel
// edge regions) to bypass the cap. Upstash gives us a single shared counter
// across cold starts and regions, and a sliding-window algorithm that doesn't
// reset hard on the hour.
//
// In non-production runtimes without the env vars set we fall back to the
// in-memory limiter so local dev keeps working without a credentials chase.

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
}

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!REDIS_URL || !REDIS_TOKEN) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'lib/rate-limit.ts: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set in production.',
    );
  }
  console.warn(
    '[rate-limit] Upstash env vars not set — falling back to in-memory limiter (dev only). Counters reset on every server restart.',
  );
}

const redis: Redis | null = REDIS_URL && REDIS_TOKEN
  ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN })
  : null;

// Cache one Ratelimit instance per (maxRequests, windowMs) tuple. Each tuple
// is a separate config in Upstash, so we keep them around to avoid recreating
// on every invocation.
const limiters = new Map<string, Ratelimit>();

function getLimiter(maxRequests: number, windowMs: number): Ratelimit | null {
  if (!redis) return null;
  const cacheKey = `${maxRequests}:${windowMs}`;
  const existing = limiters.get(cacheKey);
  if (existing) return existing;
  const limiter = new Ratelimit({
    redis,
    // Sliding window smooths out bursts compared to fixed window: a request
    // at minute 59 doesn't get a fresh budget at minute 60.
    limiter: Ratelimit.slidingWindow(maxRequests, `${windowMs} ms`),
    // Prefix keeps our keys separated from anything else in the project.
    prefix: 'ftae:rl',
    // Default analytics use a separate sorted set per limiter — small but
    // doubles command count. Keep off for the free-tier budget.
    analytics: false,
  });
  limiters.set(cacheKey, limiter);
  return limiter;
}

// In-memory fallback for dev without Upstash configured.
interface Bucket { count: number; resetAt: number }
const memoryBuckets = new Map<string, Bucket>();
function memoryRateLimit(key: string, maxRequests: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = memoryBuckets.get(key);
  if (!existing || existing.resetAt < now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: maxRequests - 1, retryAfterMs: 0 };
  }
  if (existing.count >= maxRequests) {
    return { ok: false, remaining: 0, retryAfterMs: existing.resetAt - now };
  }
  existing.count += 1;
  return { ok: true, remaining: maxRequests - existing.count, retryAfterMs: 0 };
}

export async function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const limiter = getLimiter(maxRequests, windowMs);
  if (!limiter) return memoryRateLimit(key, maxRequests, windowMs);
  const result = await limiter.limit(key);
  return {
    ok: result.success,
    remaining: result.remaining,
    retryAfterMs: Math.max(0, result.reset - Date.now()),
  };
}
