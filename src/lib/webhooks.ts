/**
 * Webhook primitives (Phase 7 W3 §3.3 / §7.5 S3-S5, S25).
 *
 * Shared by Razorpay today and any future webhook surface (Twilio spend
 * alarm, Stripe, etc). The whole point of carving this out is that signing-
 * verification + idempotency + freshness are the same shape everywhere; a
 * single audited implementation beats N copy-pastes.
 *
 *   readRawBody       — preserve exact bytes for HMAC (Next route handlers
 *                       parse JSON eagerly otherwise).
 *   verifyHmacSha256  — timing-safe HMAC-SHA256 comparison (S3).
 *   withIdempotency   — dedupe by (provider, eventId) using WebhookEvent
 *                       and reject events older than 5 minutes (S4).
 *   assertSourceIp    — optional CIDR/IP allow-list (S25).
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// 5-minute window per plan §7.5 S4. Razorpay's payload includes `created_at`
// (unix seconds); callers pass it through.
export const WEBHOOK_REPLAY_WINDOW_MS = 5 * 60 * 1000;

/**
 * Read the request body as a UTF-8 string AND its JSON-parsed form.
 *
 * The raw string is what HMAC verification operates on — JSON.stringify is
 * NOT a round-trip-safe substitute (key ordering, whitespace, escaped
 * unicode all matter). Callers MUST verify against `raw`, not against
 * `JSON.stringify(json)`.
 */
export async function readRawBody(
  req: Request,
): Promise<{ raw: string; json: unknown }> {
  const raw = await req.text();
  let json: unknown = null;
  try {
    json = raw.length > 0 ? JSON.parse(raw) : null;
  } catch (err) {
    logger.warn({ err }, "webhook.body.invalid_json");
  }
  return { raw, json };
}

/**
 * Timing-safe HMAC-SHA256 comparison (S3).
 *
 * Returns false fast when the signature is the wrong length so we never
 * pass mismatched-length buffers to `timingSafeEqual` (Node throws). The
 * signature must be hex-encoded; Razorpay sends lowercase hex.
 */
export function verifyHmacSha256(
  raw: string,
  signatureHex: string,
  secret: string,
): boolean {
  if (!signatureHex || !secret) return false;

  const expected = createHmac("sha256", secret).update(raw).digest();
  let received: Buffer;
  try {
    received = Buffer.from(signatureHex, "hex");
  } catch {
    return false;
  }
  if (received.length !== expected.length) return false;
  return timingSafeEqual(received, expected);
}

export type IdempotencyResult =
  | { ok: true; processed: true }
  | { ok: true; processed: false; reason: "duplicate" }
  | { ok: false; reason: "stale" | "error"; message: string };

/**
 * Run `fn` exactly once per (provider, eventId), provided the event is fresh.
 *
 * Order of operations matters:
 *   1. Reject stale events first — older than `WEBHOOK_REPLAY_WINDOW_MS`
 *      against `eventCreatedAt`. This is a replay-window guard, not a
 *      logical-event guard. (S4)
 *   2. Atomically insert a WebhookEvent row. Unique constraint violation =
 *      duplicate; swallow it, return `processed: false`. (W3 §3.3)
 *   3. Only then call `fn`. If `fn` throws we let it bubble — the row
 *      remains; a retried delivery will hit the duplicate branch.
 */
export async function withIdempotency(
  args: {
    provider: string;
    eventId: string;
    eventCreatedAt: Date;
    payload: unknown;
  },
  fn: () => Promise<void>,
): Promise<IdempotencyResult> {
  const now = Date.now();
  const eventAgeMs = now - args.eventCreatedAt.getTime();
  if (eventAgeMs > WEBHOOK_REPLAY_WINDOW_MS) {
    return {
      ok: false,
      reason: "stale",
      message: `Event ${args.provider}:${args.eventId} is ${Math.round(eventAgeMs / 1000)}s old (>${WEBHOOK_REPLAY_WINDOW_MS / 1000}s window).`,
    };
  }

  try {
    await db.webhookEvent.create({
      data: {
        provider: args.provider,
        eventId: args.eventId,
        payload: args.payload as object,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Prisma P2002 = unique-constraint violation on (provider, eventId).
    if (msg.includes("P2002")) {
      logger.info(
        { provider: args.provider, eventId: args.eventId },
        "webhook.duplicate",
      );
      return { ok: true, processed: false, reason: "duplicate" };
    }
    logger.error({ err, provider: args.provider }, "webhook.idempotency_insert_failed");
    return { ok: false, reason: "error", message: msg };
  }

  await fn();
  return { ok: true, processed: true };
}

/**
 * Optional source-IP allow-list (S25). The CIDR / IP list is fed in as a
 * comma-separated env string; passing an empty array disables the check
 * (preview/dev defaults).
 *
 * Two formats supported:
 *   - Exact IPv4   "203.0.113.7"
 *   - CIDR IPv4    "203.0.113.0/24"
 *
 * Vercel's edge sets `x-forwarded-for` with the client IP first. We trust
 * the leftmost value because Vercel strips client-supplied XFF before
 * appending its own.
 */
export function assertSourceIp(
  req: Request,
  allowList: string[],
): { ok: true } | { ok: false; reason: string } {
  if (allowList.length === 0) return { ok: true };

  const xff = req.headers.get("x-forwarded-for") ?? "";
  const sourceIp = xff.split(",")[0]?.trim();
  if (!sourceIp) return { ok: false, reason: "no_source_ip" };

  for (const entry of allowList) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    if (trimmed.includes("/")) {
      if (ipv4InCidr(sourceIp, trimmed)) return { ok: true };
    } else if (sourceIp === trimmed) {
      return { ok: true };
    }
  }
  return { ok: false, reason: `source_ip_not_allowed:${sourceIp}` };
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const v = Number(p);
    if (!Number.isInteger(v) || v < 0 || v > 255) return null;
    n = (n << 8) + v;
  }
  return n >>> 0;
}

function ipv4InCidr(ip: string, cidr: string): boolean {
  const [base, bitsRaw] = cidr.split("/");
  const bits = Number(bitsRaw);
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  const ipInt = ipv4ToInt(ip);
  const baseInt = ipv4ToInt(base);
  if (ipInt === null || baseInt === null) return false;
  if (bits === 0) return true;
  const mask = (0xffffffff << (32 - bits)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

/** Parse env's comma-separated CIDR list into a clean string array. */
export function parseAllowList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
