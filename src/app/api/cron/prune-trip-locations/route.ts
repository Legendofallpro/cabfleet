/**
 * TripLocation retention cron (Phase 7 W5 §S15).
 *
 * Daily sweep — TripLocation grows fastest of any table on the schema
 * (one row per driver per ~1s while on a trip). Retain only
 * env.TRIP_LOCATION_RETENTION_DAYS (default 30d) of raw points.
 * Per-booking summary survives on Booking.tripPolyline indefinitely.
 *
 * Cross-org sweep — wraps in `runWithoutOrg` so the Prisma extension
 * doesn't filter by orgId.
 *
 * Schedule: `15 3 * * *` daily (offset from prune-notifications so we
 * don't pile up on a single 03:00 burst).
 */
import { NextRequest, NextResponse } from "next/server";
import { cronAuthGuard } from "@/lib/cron-auth";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { runWithoutOrg } from "@/lib/org-context";

export const dynamic = "force-dynamic";

async function handler(req: NextRequest) {
  const denied = cronAuthGuard(req, "/api/cron/prune-trip-locations");
  if (denied) return denied;

  return runWithoutOrg("cron:prune-trip-locations", async () => {
    const cutoff = new Date(
      Date.now() - env.TRIP_LOCATION_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );

    const result = await db.tripLocation.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    logger.info(
      {
        deleted: result.count,
        cutoff: cutoff.toISOString(),
      },
      "cron.prune-trip-locations.completed",
    );

    return NextResponse.json({
      deleted: result.count,
      cutoff: cutoff.toISOString(),
    });
  });
}

export const GET = handler;
export const POST = handler;
