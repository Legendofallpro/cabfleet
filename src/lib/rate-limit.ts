/**
 * Lightweight in-memory sliding-window rate limiter.
 *
 * This is the dev/single-instance backstop. In production behind multiple
 * Node instances you want a shared store (Upstash Redis) so counters are
 * consistent across replicas; wire that in by replacing `checkLimit` with
 * a call to `@upstash/ratelimit` when `env.UPSTASH_REDIS_REST_URL` is set
 * (env keys are already declared in `src/lib/env.ts`).
 *
 * See docs/web-app-security.md §14.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

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

export function checkLimit(key: string, opts: RateLimitOptions): RateLimitResult {
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

/** Common limiter presets. Tune per-route. */
export const LIMITS = {
  /** Auth endpoints (sign-in, sign-up, password reset). */
  auth: { windowMs: 60_000, max: 10 },
  /** Per-actor server action default. */
  action: { windowMs: 60_000, max: 60 },
  /** API routes (cron etc.). */
  api: { windowMs: 60_000, max: 30 },
} as const;

/** Best-effort client IP extraction from common proxy headers. */
export function getClientIp(req: { headers: Headers }): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("cf-connecting-ip") ??
    "unknown"
  );
}

/** Periodically prune expired buckets so the Map doesn't grow unbounded. */
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, 5 * 60_000).unref?.();
}
