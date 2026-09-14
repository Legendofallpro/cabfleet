/**
 * Notification outbox drain (Phase 7 W2 §2.3, §6.2).
 *
 * Vercel Cron entrypoint — runs every minute. Picks up to N PENDING /
 * FAILED rows whose `nextAttemptAt` has passed and dispatches each via
 * `NotificationService.dispatch`. On failure, schedules the next attempt
 * with exponential backoff:
 *
 *     1 minute -> 5 minutes -> 30 minutes -> 2 hours
 *
 * After 4 failed attempts the row moves to DEAD_LETTER and surfaces in the
 * admin notifications viewer (deferred follow-up).
 *
 * Cron auth matches the existing `/api/cron/promote-hybrid` pattern:
 * `Authorization: Bearer ${env.CRON_SECRET}`. Endpoint returns 503 when
 * CRON_SECRET is unset so we fail closed rather than open.
 *
 * Configure in vercel.json:
 *   { "crons": [{ "path": "/api/cron/drain-notifications", "schedule": "* * * * *" }] }
 */
import { NextRequest, NextResponse } from "next/server";
import { cronAuthGuard } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { runWithoutOrg } from "@/lib/org-context";
import { dispatch } from "@/modules/notifications/services/NotificationService";

// In milliseconds. Plan §6.2: 1m, 5m, 30m, 2h.
const BACKOFF_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 60 * 60_000];
const MAX_ATTEMPTS = BACKOFF_MS.length;
const BATCH_SIZE = 50;

function pickNextAttemptAt(nextAttempts: number): Date {
  // attempts counter is incremented BEFORE this call. So a row that just
  // failed for the first time has attempts=1 here; next delay = BACKOFF_MS[0].
  const idx = Math.min(nextAttempts - 1, MAX_ATTEMPTS - 1);
  return new Date(Date.now() + BACKOFF_MS[idx]);
}

async function handler(req: NextRequest) {
  const denied = cronAuthGuard(req, "/api/cron/drain-notifications");
  if (denied) return denied;

  // The drain crosses org boundaries (one cron, many orgs), so bypass the
  // tenant filter explicitly. The reason is captured for audit.
  return runWithoutOrg("cron:drain-notifications", async () => {
    const now = new Date();

    const due = await db.notificationOutbox.findMany({
      where: {
        status: { in: ["PENDING", "FAILED"] },
        nextAttemptAt: { lte: now },
      },
      orderBy: { nextAttemptAt: "asc" },
      take: BATCH_SIZE,
    });

    if (due.length === 0) {
      return NextResponse.json({ drained: 0 });
    }

    let sent = 0;
    let failed = 0;
    let deadLettered = 0;

    for (const row of due) {
      // Claim the row: bump to PROCESSING so a concurrent invocation doesn't
      // double-send. Cheap optimistic claim — race-loser sees status !=
      // (PENDING|FAILED) on the next pass and skips.
      const claimed = await db.notificationOutbox.updateMany({
        where: {
          id: row.id,
          status: { in: ["PENDING", "FAILED"] },
        },
        data: { status: "PROCESSING" },
      });
      if (claimed.count === 0) continue;

      const payload =
        (row.payload as {
          variables?: Record<string, string | number>;
          locale?: string;
          urgent?: boolean;
        } | null) ?? {};

      const outcome = await dispatch({
        orgId: row.orgId,
        bookingId: row.bookingId,
        templateId: row.templateId,
        channel: row.channel,
        recipient: row.recipient,
        variables: payload.variables ?? {},
        locale: payload.locale,
        urgent: payload.urgent,
      });

      const attempts = row.attempts + 1;

      if (outcome.ok) {
        await db.notificationOutbox.update({
          where: { id: row.id },
          data: {
            status: "SENT",
            attempts,
            sentAt: outcome.skipped ? null : new Date(),
            lastError: outcome.skipReason ?? null,
          },
        });
        sent++;
      } else if (attempts >= MAX_ATTEMPTS) {
        await db.notificationOutbox.update({
          where: { id: row.id },
          data: {
            status: "DEAD_LETTER",
            attempts,
            lastError: outcome.errorMessage?.slice(0, 500) ?? "unknown",
          },
        });
        deadLettered++;
        logger.error(
          {
            outboxId: row.id,
            templateId: row.templateId,
            channel: row.channel,
            attempts,
          },
          "notification.dead_letter",
        );
      } else {
        await db.notificationOutbox.update({
          where: { id: row.id },
          data: {
            status: "FAILED",
            attempts,
            nextAttemptAt: pickNextAttemptAt(attempts),
            lastError: outcome.errorMessage?.slice(0, 500) ?? "unknown",
          },
        });
        failed++;
      }
    }

    logger.info(
      { drained: due.length, sent, failed, deadLettered },
      "cron.drain_notifications.done",
    );
    return NextResponse.json({
      drained: due.length,
      sent,
      failed,
      deadLettered,
    });
  });
}

export const POST = handler;
export const GET = handler;
