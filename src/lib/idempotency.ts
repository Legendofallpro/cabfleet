/**
 * Idempotency-Key response cache (Phase 7 W4 §4.1).
 *
 * Transparent in-memory ↔ Upstash Redis swap. Selection rule mirrors
 * `src/lib/rate-limit.ts`: Upstash when both REST env vars are set,
 * in-memory otherwise.
 *
 * Why this lives separate from rate-limit
 * ---------------------------------------
 * Rate limiter buckets are tiny (counter + reset timestamp); the
 * idempotency cache stores full response bodies. Keeping them apart
 * lets us tune TTL + storage independently and makes the rate-limit
 * module reusable (and currently it's also imported by the auth-IP
 * middleware path, which we don't want loading the response-cache
 * code).
 *
 * Cache key shape
 * ---------------
 * Owned by the caller — we don't shape it here so that callers can mix
 * profile id + url + raw header without us second-guessing. The default
 * shape lives in `withApiHandler.ts` as `${profileId}:${pathname}:${header}`.
 */

import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

export type IdempotencyEntry = {
  body: string;
  status: number;
  contentType: string;
};

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

function redisKey(key: string): string {
  return `idem:${key}`;
}

// ──────────────────────────────────────────────────────────────────────
// In-memory fallback
// ──────────────────────────────────────────────────────────────────────
type Cached = IdempotencyEntry & { expiresAt: number };
const memoryStore = new Map<string, Cached>();

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of memoryStore) {
      if (v.expiresAt <= now) memoryStore.delete(k);
    }
  }, 5 * 60_000).unref?.();
}

// ──────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────

/**
 * Fetch a previously-cached response, or null if not present / expired.
 *
 * On Upstash REST errors we treat the entry as absent — replaying the
 * mutation is the original behaviour and strictly safer than failing
 * the request entirely.
 */
export async function getIdempotencyEntry(
  key: string,
): Promise<IdempotencyEntry | null> {
  const redis = getRedis();
  if (!redis) {
    const cached = memoryStore.get(key);
    if (!cached) return null;
    if (cached.expiresAt <= Date.now()) {
      memoryStore.delete(key);
      return null;
    }
    return {
      body: cached.body,
      status: cached.status,
      contentType: cached.contentType,
    };
  }
  try {
    const raw = await redis.get<IdempotencyEntry>(redisKey(key));
    if (!raw) return null;
    // Upstash returns objects directly when stored via the JSON-aware
    // SET; defensive parse if a string slips through (older clients).
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw) as IdempotencyEntry;
      } catch {
        return null;
      }
    }
    return raw;
  } catch {
    return null;
  }
}

/**
 * Persist a response for `ttlMs`. Errors are swallowed — losing one
 * cache entry is a tolerable degradation; rejecting the user's success
 * response because we couldn't persist is not.
 */
export async function setIdempotencyEntry(
  key: string,
  entry: IdempotencyEntry,
  ttlMs: number,
): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    memoryStore.set(key, { ...entry, expiresAt: Date.now() + ttlMs });
    return;
  }
  try {
    // Upstash EX is in seconds; round up so a sub-second TTL still
    // persists for at least one second rather than expiring immediately.
    const ttlSec = Math.max(1, Math.ceil(ttlMs / 1000));
    await redis.set(redisKey(key), entry, { ex: ttlSec });
  } catch {
    /* best effort */
  }
}

/** Test helper — empties the in-memory store. No-op on Upstash. */
export async function __clearIdempotencyForTests(): Promise<void> {
  memoryStore.clear();
}
