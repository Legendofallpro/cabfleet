/**
 * Twilio spend-alarm webhook (Phase 7 W2 §7.4 S8).
 *
 * Twilio's Programmable Messaging dashboard supports usage-trigger webhooks
 * that fire when a configured account-level spend threshold is crossed.
 * This route is the receiver: it verifies the `X-Twilio-Signature` HMAC,
 * persists the event to `WebhookEvent` (forensic trail), and emits a
 * structured error log so the operator's monitoring tool (Sentry / Datadog
 * / PagerDuty) can page on-call.
 *
 * What it does NOT do (today):
 *   - Auto-pause the notification pipeline. That requires a system-state
 *     row + a check in NotificationService.dispatch. Out of scope here
 *     because the human-in-the-loop is the documented control plane (plan
 *     §7.4 S8 calls for "pages on-call"); an auto-pause adds operational
 *     complexity that compounds with real outages.
 *
 * Twilio signs the body with the account's auth token:
 *   sig = base64(hmac-sha1(authToken, url + sortedFormParams))
 * but for JSON-payload webhooks (which Programmable Messaging usage
 * triggers send) Twilio uses HMAC-SHA256 of the raw body with the same
 * auth token. We accept either by trying SHA256 first against the body
 * and falling back to a length-mismatch failure if the header looks SHA1.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { readRawBody } from "@/lib/webhooks";
import { runWithoutOrg } from "@/lib/org-context";

export const dynamic = "force-dynamic";

/**
 * Twilio's signature header is base64-encoded. SHA256 digests are 32
 * bytes / 44 base64 chars (with padding). SHA1 digests are 20 bytes /
 * 28 base64 chars. We compute SHA256 of the raw body using
 * `TWILIO_AUTH_TOKEN_WEBHOOK` as the secret and compare timing-safely.
 */
function verifyTwilioSignature(
  raw: string,
  headerSig: string,
  secret: string,
): boolean {
  if (!headerSig || !secret) return false;
  const expected = createHmac("sha256", secret).update(raw).digest();
  let received: Buffer;
  try {
    received = Buffer.from(headerSig, "base64");
  } catch {
    return false;
  }
  if (received.length !== expected.length) return false;
  return timingSafeEqual(received, expected);
}

async function handler(req: NextRequest): Promise<NextResponse> {
  if (!env.TWILIO_AUTH_TOKEN_WEBHOOK) {
    logger.warn(
      { path: "/api/webhooks/twilio-spend" },
      "twilio.spend.webhook.disabled.no_secret",
    );
    return NextResponse.json(
      { error: "Webhook disabled — secret unset" },
      { status: 503 },
    );
  }

  const { raw, json } = await readRawBody(req);
  const headerSig = req.headers.get("x-twilio-signature") ?? "";
  if (!verifyTwilioSignature(raw, headerSig, env.TWILIO_AUTH_TOKEN_WEBHOOK)) {
    logger.warn(
      { sigLen: headerSig.length, bodyLen: raw.length },
      "twilio.spend.webhook.signature_mismatch",
    );
    return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  }

  if (!json || typeof json !== "object") {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = json as {
    UsageTriggerSid?: string;
    UsageCategory?: string;
    CurrentUsage?: string;
    TriggerValue?: string;
  };

  const eventId =
    payload.UsageTriggerSid ??
    `twilio-spend-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  await runWithoutOrg("webhook:twilio-spend", async () => {
    try {
      await db.webhookEvent.create({
        data: {
          provider: "TWILIO_SPEND",
          eventId,
          payload: payload as object,
        },
      });
    } catch (err) {
      // Duplicate (Twilio re-delivery) is harmless — the alarm log fires
      // either way.
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("P2002")) throw err;
    }
  });

  // ERROR level so Sentry (S16) escalates. The runbook is "investigate
  // immediately and flip NOTIFICATIONS_ENABLED=false if the spike is from
  // a runaway template".
  logger.error(
    {
      usageCategory: payload.UsageCategory,
      currentUsage: payload.CurrentUsage,
      triggerValue: payload.TriggerValue,
      thresholdUsd: env.TWILIO_DAILY_SPEND_THRESHOLD_USD,
    },
    "twilio.spend.alarm",
  );

  return NextResponse.json({ ok: true });
}

export const POST = handler;
