/**
 * Razorpay webhook receiver (Phase 7 W3 §3.3, §7.5 S3-S5, S25).
 *
 * Always returns 200 OK for any signed-and-fresh event — even when we
 * decide not to do anything with it. Razorpay otherwise retries
 * indefinitely; we'd rather absorb the event, persist it for forensics,
 * and decide what to do with it on our own timeline.
 *
 * Status codes the body lands on:
 *   200 — processed OR de-duplicated OR intentionally ignored
 *   400 — body is not valid JSON, missing event id / created_at
 *   401 — signature mismatch
 *   403 — source IP outside the allow-list (S25)
 *   408 — event older than the 5-minute replay window (S4)
 *   503 — RAZORPAY_WEBHOOK_SECRET unset (fail-closed in non-prod)
 */
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import {
  assertSourceIp,
  parseAllowList,
  readRawBody,
  verifyHmacSha256,
  withIdempotency,
} from "@/lib/webhooks";
import { recordPaymentFromWebhook } from "@/modules/payments/services/recordPaymentFromWebhook";

const PROVIDER = "RAZORPAY";

// Route handlers in Next 15 default to dynamic when they read headers/body,
// but we set it explicitly so this never gets prerendered.
export const dynamic = "force-dynamic";

async function handler(req: NextRequest): Promise<NextResponse> {
  if (!env.RAZORPAY_WEBHOOK_SECRET) {
    logger.warn(
      { path: "/api/webhooks/razorpay" },
      "razorpay.webhook.disabled.no_secret",
    );
    return NextResponse.json(
      { error: "Webhook disabled — secret unset" },
      { status: 503 },
    );
  }

  // S25: source IP allow-list (optional — empty list disables the check).
  const allowList = parseAllowList(env.RAZORPAY_WEBHOOK_IPS);
  const ipCheck = assertSourceIp(req, allowList);
  if (!ipCheck.ok) {
    logger.warn(
      { reason: ipCheck.reason },
      "razorpay.webhook.source_ip_blocked",
    );
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // S3: read raw body BEFORE parsing JSON; verify HMAC against bytes.
  const { raw, json } = await readRawBody(req);
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  if (!verifyHmacSha256(raw, signature, env.RAZORPAY_WEBHOOK_SECRET)) {
    logger.warn(
      { sigLen: signature.length, bodyLen: raw.length },
      "razorpay.webhook.signature_mismatch",
    );
    return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  }

  if (!json || typeof json !== "object") {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = json as {
    id?: string;
    event?: string;
    created_at?: number;
  };
  const eventId = event.id;
  const eventCreatedAtSec = event.created_at;
  if (!eventId || !eventCreatedAtSec) {
    return NextResponse.json(
      { error: "Missing event id / created_at" },
      { status: 400 },
    );
  }

  const eventCreatedAt = new Date(eventCreatedAtSec * 1000);

  // S4 freshness + idempotency. withIdempotency inserts a WebhookEvent row
  // first; duplicate (provider, eventId) gets silently 200'd.
  const result = await withIdempotency(
    {
      provider: PROVIDER,
      eventId,
      eventCreatedAt,
      payload: json,
    },
    async () => {
      // We've already validated `json` is an object above; cast for the
      // service layer's narrower type. Validation errors inside surface as
      // structured logs but DON'T 5xx — Razorpay must not retry on our
      // application-layer parsing issues.
      const outcome = await recordPaymentFromWebhook(
        json as Parameters<typeof recordPaymentFromWebhook>[0],
      );
      logger.info(
        { eventId, eventType: event.event, outcome },
        "razorpay.webhook.applied",
      );
    },
  );

  if (!result.ok) {
    if (result.reason === "stale") {
      return NextResponse.json({ error: "Stale event" }, { status: 408 });
    }
    logger.error(
      { eventId, reason: result.reason, message: result.message },
      "razorpay.webhook.error",
    );
    return NextResponse.json({ error: "Processing error" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    processed: result.processed,
    ...(result.processed ? {} : { reason: result.reason }),
  });
}

export const POST = handler;
