/**
 * Notification retention cron (Phase 7 W2 §6.5 S14).
 *
 * Daily sweep that hard-deletes old NotificationLog and stale DEAD_LETTER
 * outbox rows. Both tables grow monotonically — without pruning the
 * NotificationLog dwarfs the rest of the schema within a year of
 * production load.
 *
 *   NotificationLog       → retained env.NOTIFICATION_LOG_RETENTION_DAYS (90d default)
 *   NotificationOutbox    → only DEAD_LETTER rows older than
 *                           env.NOTIFICATION_DEADLETTER_RETENTION_DAYS (180d default)
 *                           are pruned; PENDING/PROCESSING/SENT/FAILED rows
 *                           are managed by the drain cron.
 *
 * Suitable schedule (vercel.json): `0 3 * * *` (3am UTC daily).
 *
 * Cross-org sweep — wraps in `runWithoutOrg` so the Prisma extension
 * doesn't filter by `orgId`.
 */
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { runWithoutOrg } from "@/lib/org-context";

export const dynamic = "force-dynamic";

async function handler(req: NextRequest) {
  if (!env.CRON_SECRET) {
    logger.warn(
      { path: "/api/cron/prune-notifications" },
      "cron.disabled.no_secret",
    );
    return NextResponse.json({ error: "Cron disabled" }, { status: 503 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return runWithoutOrg("cron:prune-notifications", async () => {
    const now = Date.now();
    const logCutoff = new Date(
      now - env.NOTIFICATION_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );
    const outboxCutoff = new Date(
      now - env.NOTIFICATION_DEADLETTER_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );

    const [logResult, outboxResult] = await Promise.all([
      db.notificationLog.deleteMany({
        where: { createdAt: { lt: logCutoff } },
      }),
      db.notificationOutbox.deleteMany({
        where: { status: "DEAD_LETTER", updatedAt: { lt: outboxCutoff } },
      }),
    ]);

    logger.info(
      {
        logsDeleted: logResult.count,
        outboxDeleted: outboxResult.count,
        logCutoff: logCutoff.toISOString(),
        outboxCutoff: outboxCutoff.toISOString(),
      },
      "cron.prune-notifications.completed",
    );

    return NextResponse.json({
      logsDeleted: logResult.count,
      outboxDeleted: outboxResult.count,
    });
  });
}

export const GET = handler;
export const POST = handler;
