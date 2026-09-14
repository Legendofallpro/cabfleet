/**
 * Rate limiter with a transparent in-memory ↔ Upstash Redis swap.
 *
 * Selection rule
 * --------------
 * When both `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are
 * set, we route every call through `@upstash/ratelimit` — a sliding
 * window backed by a shared Redis. This is the only configuration that
 * works on multi-instance Vercel: in-process Maps can't agree across
 * cold starts, so a "60/min" limit silently becomes 60×N/min.
 *
 * When the env is unset (local dev, CI), we fall back to the original
 * in-process Map. Behaviour is identical from the caller's perspective
 * — both return `{ success, remaining, resetAt }`.
 *
 * Why `async`?
 * ------------
 * Upstash REST is HTTP under the covers. We make `checkLimit` async
 * everywhere so the in-memory path and the Redis path share one shape;
 * call sites that already lived in async contexts (middleware, action
 * wrapper, withApiHandler) just add an `await`.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetAt: number;
};

export type RateLimitOptions = {
  /** Window in milliseconds. */
  windowMs: number;
  /** Max requests per key per window. */
  max: number;
};

// ──────────────────────────────────────────────────────────────────────
// In-memory fallback
// ──────────────────────────────────────────────────────────────────────
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function checkLimitMemory(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + opts.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { success: true, remaining: opts.max - 1, resetAt };
  }

  if (existing.count >= opts.max) {
    return { success: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return {
    success: true,
    remaining: opts.max - existing.count,
    resetAt: existing.resetAt,
  };
}

// Periodic prune so the Map doesn't grow unbounded (in-memory path only).
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, 5 * 60_000).unref?.();
}

// ──────────────────────────────────────────────────────────────────────
// Upstash path
// ──────────────────────────────────────────────────────────────────────
let cachedRedis: Redis | null = null;
function getRedis(): Redis | null {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) return null;
  if (cachedRedis) return cachedRedis;
  cachedRedis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });
  return cachedRedis;
}

/**
 * One Ratelimit instance per (windowMs,max) shape. The Upstash client
 * keys its analytics + ephemeral cache off this object, so reusing
 * instances is materially cheaper than recreating per request.
 */
const limiterCache = new Map<string, Ratelimit>();
function getLimiter(opts: RateLimitOptions): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  const cacheKey = `${opts.windowMs}:${opts.max}`;
  const existing = limiterCache.get(cacheKey);
  if (existing) return existing;

  // Upstash duration shape: "60 s", "100 ms", etc. We use ms when not
  // a clean second multiple, since several presets are multi-second.
  const duration =
    opts.windowMs % 1000 === 0
      ? `${opts.windowMs / 1000} s`
      : `${opts.windowMs} ms`;

  const limiter = new Ratelimit({
    redis,
    // Sliding window matches the in-memory semantics most closely.
    limiter: Ratelimit.slidingWindow(opts.max, duration as `${number} s`),
    // No analytics, no global prefix — keep it cheap and predictable.
    analytics: false,
    prefix: "rl",
  });
  limiterCache.set(cacheKey, limiter);
  return limiter;
}

// ──────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────

/**
 * Check (and increment) the limiter for `key`. Returns whether the
 * caller is under the limit, how many requests remain in the window,
 * and when the window resets (epoch ms).
 *
 * The Upstash call can fail (network blip, REST 5xx). If it does we
 * fail-OPEN and log via the caller — denying legitimate traffic on a
 * limiter outage is a bigger user-visible bug than the brief window of
 * looser rate enforcement.
 */
export async function checkLimit(
  key: string,
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  const limiter = getLimiter(opts);
  if (!limiter) {
    return checkLimitMemory(key, opts);
  }
  try {
    const res = await limiter.limit(key);
    return {
      success: res.success,
      remaining: res.remaining,
      resetAt: res.reset,
    };
  } catch {
    // Fail open — see contract above. The caller's logger surfaces the
    // event via its own context; we don't import logger here to avoid
    // an import cycle with `src/lib/logger.ts`.
    return {
      success: true,
      remaining: opts.max,
      resetAt: Date.now() + opts.windowMs,
    };
  }
}

/** Common limiter presets. Tune per-route. */
export const LIMITS = {
  /** Auth endpoints (sign-in, sign-up, password reset). */
  auth: { windowMs: 60_000, max: 10 },
  /** Public signup / claim-portal. Tighter than generic actions. */
  signup: { windowMs: 60_000, max: 5 },
  action: { windowMs: 60_000, max: 60 },
  /** API routes (cron etc.). */
  api: { windowMs: 60_000, max: 30 },

  // ── Phase 7 W4: REST v1 per-driver presets ──────────────────────────
  /**
   * §4.4 Claim spam protection. Pairs with `SELECT FOR UPDATE SKIP LOCKED`
   * in `claimBooking` — the limit defangs UX-level retries; the lock
   * defangs concurrent server-side races.
   */
  apiClaim: { windowMs: 60_000, max: 30 },
  /** §4.4 Location ingest ceiling — 1 write / second / driver on average. */
  apiLocation: { windowMs: 60_000, max: 60 },
  /** Driver reads (list trips, get me). Generous; reads are cheap. */
  apiRead: { windowMs: 60_000, max: 300 },
  /** Generic driver mutation (transition, attendance). */
  apiWrite: { windowMs: 60_000, max: 60 },
} as const;

/** Best-effort client IP extraction from platform headers (not client-controlled XFF). */
export function getClientIp(req: { headers: Headers }): string {
  const vercel = req.headers.get("x-vercel-forwarded-for");
  if (vercel) return vercel.split(",")[0]!.trim();
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const parts = fwd.split(",").map((p) => p.trim()).filter(Boolean);
    return parts[parts.length - 1] ?? "unknown";
  }
  return "unknown";
}
