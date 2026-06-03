/**
 * Admin "clear suspicious counter" service (Phase 7 W5 deferred).
 *
 * Pairs with `assertCanCompleteTrip` in `policy.ts`. When live-location
 * plausibility flags drive `Booking.suspiciousLocationCount` past
 * `LOCATION_SUSPICIOUS_THRESHOLD`, the trip cannot transition to
 * COMPLETED until ops reviews the flagged points and explicitly resets
 * the counter via this service.
 *
 * The reset is audited as a STATUS_CHANGE (closest existing AuditAction
 * value; we tag the diff with `kind: "CLEAR_SUSPICIOUS_COUNTER"` so
 * reports can filter cleanly). The reason is mandatory and stored
 * verbatim in the audit row.
 */
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { writeAudit } from "@/lib/audit";
import { ok, type Result } from "@/lib/result";
import { logger } from "@/lib/logger";

type Actor = { id: string };

export async function clearSuspiciousCounter(
  bookingId: string,
  reason: string,
  actor: Actor,
): Promise<Result<true>> {
  const booking = await db.booking.findFirst({
    where: { id: bookingId, deletedAt: null },
    select: { id: true, suspiciousLocationCount: true },
  });
  if (!booking) throw new AppError("NOT_FOUND", "Booking not found.");
  if (booking.suspiciousLocationCount === 0) {
    // Idempotent no-op rather than an error — clicking twice from the
    // UI shouldn't surface a confusing "nothing to clear" message.
    return ok(true);
  }

  await db.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: bookingId },
      data: { suspiciousLocationCount: 0 },
    });
    await writeAudit(tx, {
      entity: "Booking",
      entityId: bookingId,
      action: "STATUS_CHANGE",
      byProfileId: actor.id,
      diff: {
        kind: "CLEAR_SUSPICIOUS_COUNTER",
        before: { suspiciousLocationCount: booking.suspiciousLocationCount },
        after: { suspiciousLocationCount: 0 },
        reason,
      },
    });
  });

  logger.info(
    {
      bookingId,
      actorId: actor.id,
      cleared: booking.suspiciousLocationCount,
    },
    "tracking.suspicious_counter.cleared",
  );

  return ok(true);
}
