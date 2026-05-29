/**
 * Vercel Cron job — runs every minute.
 *
 * Finds all PENDING bookings whose claimTimeoutAt has passed and promotes them
 * to OPEN_FOR_CLAIM so drivers can claim them.
 *
 * Security: Vercel automatically sets the "Authorization: Bearer <CRON_SECRET>"
 * header on cron invocations. We verify this before processing.
 *
 * Configure in vercel.json:
 *   { "crons": [{ "path": "/api/cron/promote-hybrid", "schedule": "* * * * *" }] }
 */
import { NextRequest, NextResponse } from "next/server";
import { BookingStatus } from "@prisma/client";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { transitionBookingStatus } from "@/modules/bookings/services/transitionBookingStatus";
import { logger } from "@/lib/logger";

/**
 * Cron-initiated transitions use byProfileId: null so that the AuditLog row
 * has no FK reference to a non-existent profile. The reason field identifies
 * the source of the transition instead.
 */

async function handler(req: NextRequest) {
  // Authenticate the cron caller. CRON_SECRET is required in production (see
  // src/lib/env.ts). In other environments we still require the header so a
  // missing secret means "endpoint disabled" rather than "open to the world".
  if (!env.CRON_SECRET) {
    logger.warn({ path: "/api/cron/promote-hybrid" }, "cron.disabled.no_secret");
    return NextResponse.json({ error: "Cron disabled" }, { status: 503 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    logger.warn({ path: "/api/cron/promote-hybrid" }, "cron.unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Find PENDING bookings whose hybrid timer has expired
  const expired = await db.booking.findMany({
    where: {
      status: BookingStatus.PENDING,
      claimTimeoutAt: { lte: now },
      deletedAt: null,
    },
    select: { id: true },
    take: 100, // process at most 100 per invocation to stay within timeout
  });

  if (expired.length === 0) {
    return NextResponse.json({ promoted: 0 });
  }

  const results = await Promise.allSettled(
    expired.map((b) =>
      transitionBookingStatus(b.id, {
        toStatus: BookingStatus.OPEN_FOR_CLAIM,
        byProfileId: null,
        reason: "Hybrid dispatch timeout — opened for driver claim",
      }),
    ),
  );

  let promoted = 0;
  let failed = 0;
  for (const r of results) {
    if (r.status === "fulfilled" && r.value.ok) {
      promoted++;
    } else {
      failed++;
      if (r.status === "rejected") {
        logger.error({ err: r.reason }, "cron.promote_hybrid.transition_failed");
      }
    }
  }

  logger.info({ promoted, failed, total: expired.length }, "cron.promote_hybrid.done");
  return NextResponse.json({ promoted, failed });
}

// Accept POST (state-changing) and GET (Vercel Cron uses GET with bearer).
export const POST = handler;
export const GET = handler;
