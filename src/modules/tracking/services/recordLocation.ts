/**
 * Live-location ingest service (Phase 7 W5).
 *
 * Two surfaces:
 *   - recordLocation: single point
 *   - recordLocationBatch: ≤60 points in one POST
 *
 * Both follow the same pipeline per point:
 *   1. Load booking (consent + status + pickup coords + last point)
 *   2. Reject if no locationConsentAt (§S15) or booking not in-trip
 *   3. Run plausibility (§S7) — flagged points are persisted but with
 *      flagged=true; the booking's suspiciousLocationCount increments
 *   4. Insert TripLocation row, inside the same transaction
 *   5. Fire-and-forget broadcast on the realtime channel
 *
 * Why we persist flagged points: keeping them gives ops a forensic
 * trail ("did the driver fake their location?"). The customer map
 * filters them out client-side.
 *
 * Status gating
 * -------------
 * Accepted booking statuses for ingest: CLAIMED, ASSIGNED,
 * DRIVER_EN_ROUTE, IN_PROGRESS. PENDING/OPEN_FOR_CLAIM is a no-driver
 * window; COMPLETED/CANCELLED/etc are terminal. Anything else returns
 * CONFLICT so the mobile app stops emitting and frees the user's data
 * budget.
 */
import { BookingStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { err, ok, type Result } from "@/lib/result";
import { logger } from "@/lib/logger";
import {
  evaluatePoint,
  type PlausibilityVerdict,
} from "@/modules/tracking/services/plausibility";
import {
  broadcastLocations,
  type BroadcastPoint,
} from "@/modules/tracking/services/broadcast";
import type { LocationPointInput } from "@/modules/tracking/validators/location";

const INGEST_ACCEPTED_STATUSES = new Set<BookingStatus>([
  BookingStatus.CLAIMED,
  BookingStatus.ASSIGNED,
  BookingStatus.DRIVER_EN_ROUTE,
  BookingStatus.IN_PROGRESS,
]);

export type RecordLocationInput = {
  bookingId: string;
  driverId: string;
  points: LocationPointInput[];
};

export type RecordLocationOutput = {
  accepted: number;
  flagged: number;
  suspiciousLocationCount: number;
};

export async function recordLocation(
  input: RecordLocationInput,
): Promise<Result<RecordLocationOutput>> {
  if (!env.REALTIME_TRACKING_ENABLED) {
    return err({
      code: "FORBIDDEN",
      message: "Live tracking is not enabled.",
    });
  }

  const booking = await db.booking.findFirst({
    where: { id: input.bookingId, deletedAt: null },
    select: {
      id: true,
      status: true,
      locationConsentAt: true,
      suspiciousLocationCount: true,
      pickupLat: true,
      pickupLng: true,
      claimedByDriverId: true,
      assignedDriverId: true,
    },
  });
  if (!booking) {
    return err({ code: "NOT_FOUND", message: "Booking not found." });
  }

  // Driver ownership double-check. Route already enforces this, but
  // services are call-from-anywhere — defence in depth.
  const owns =
    booking.claimedByDriverId === input.driverId ||
    booking.assignedDriverId === input.driverId;
  if (!owns) {
    return err({
      code: "FORBIDDEN",
      message: "Driver is not assigned to this booking.",
    });
  }

  if (!INGEST_ACCEPTED_STATUSES.has(booking.status)) {
    return err({
      code: "CONFLICT",
      message: `Cannot ingest location for status ${booking.status}.`,
    });
  }

  if (!booking.locationConsentAt) {
    return err({
      code: "FORBIDDEN",
      message: "Customer has not consented to location sharing for this trip.",
    });
  }

  // Load the last accepted point for derived-speed plausibility. Cheap —
  // single row, hot index (bookingId, recordedAt DESC).
  const lastPoint = await db.tripLocation.findFirst({
    where: { bookingId: input.bookingId },
    orderBy: { recordedAt: "desc" },
    select: { lat: true, lng: true, recordedAt: true },
  });

  // Sort incoming points by recordedAt so the chain plausibility is
  // monotonic. The client SHOULD batch in order but we don't trust it.
  const points = [...input.points].sort(
    (a, b) => a.recordedAt.getTime() - b.recordedAt.getTime(),
  );

  // Pickup coords for first-point check. Decimal | null → number | null.
  const pickup =
    booking.pickupLat !== null && booking.pickupLng !== null
      ? { lat: Number(booking.pickupLat), lng: Number(booking.pickupLng) }
      : null;

  const isFirstPointEver = lastPoint === null;

  let prev: { lat: number; lng: number; recordedAt: Date } | null = lastPoint
    ? {
        lat: Number(lastPoint.lat),
        lng: Number(lastPoint.lng),
        recordedAt: lastPoint.recordedAt,
      }
    : null;

  const evaluated: {
    point: LocationPointInput;
    verdict: PlausibilityVerdict;
  }[] = [];
  let flaggedCount = 0;

  for (let i = 0; i < points.length; i += 1) {
    const candidate = points[i];
    const verdict = evaluatePoint(
      {
        lat: candidate.lat,
        lng: candidate.lng,
        recordedAt: candidate.recordedAt,
        speedKph: candidate.speedKph ?? null,
      },
      {
        pickup,
        previous: prev,
        isFirstPoint: isFirstPointEver && i === 0,
        maxSpeedKph: env.LOCATION_MAX_SPEED_KPH,
        firstPointMaxKm: env.LOCATION_FIRST_POINT_MAX_KM,
      },
    );
    evaluated.push({ point: candidate, verdict });
    if (!verdict.ok) flaggedCount += 1;
    // Update prev unconditionally — even flagged points anchor the chain
    // (a real GPS spike followed by a recovery shouldn't double-flag).
    prev = {
      lat: candidate.lat,
      lng: candidate.lng,
      recordedAt: candidate.recordedAt,
    };
  }

  // Atomic write: TripLocation rows + suspicious counter bump.
  const written = await db.$transaction(async (tx) => {
    const created = await Promise.all(
      evaluated.map(({ point, verdict }) =>
        tx.tripLocation.create({
          data: {
            bookingId: input.bookingId,
            driverId: input.driverId,
            lat: new Prisma.Decimal(point.lat),
            lng: new Prisma.Decimal(point.lng),
            speedKph:
              point.speedKph !== undefined
                ? new Prisma.Decimal(point.speedKph)
                : null,
            recordedAt: point.recordedAt,
            flagged: !verdict.ok,
            flagReason: verdict.ok ? null : verdict.reason,
          },
          select: { lat: true, lng: true, recordedAt: true, flagged: true },
        }),
      ),
    );

    if (flaggedCount > 0) {
      await tx.booking.update({
        where: { id: input.bookingId },
        data: {
          suspiciousLocationCount: {
            increment: flaggedCount,
          },
        },
      });
    }

    return created;
  });

  // Broadcast fire-and-forget. Filtered (non-flagged) points only — the
  // customer map shouldn't show known-bad coordinates.
  const broadcastPoints: BroadcastPoint[] = written
    .filter((p) => !p.flagged)
    .map((p) => ({
      lat: Number(p.lat),
      lng: Number(p.lng),
      recordedAt: p.recordedAt.toISOString(),
      flagged: false,
    }));
  if (broadcastPoints.length > 0) {
    void broadcastLocations({
      bookingId: input.bookingId,
      points: broadcastPoints,
    });
  }

  if (flaggedCount > 0) {
    logger.warn(
      {
        bookingId: input.bookingId,
        driverId: input.driverId,
        flagged: flaggedCount,
        firstReason: evaluated.find((e) => !e.verdict.ok)?.verdict,
      },
      "tracking.point.flagged",
    );
  }

  return ok({
    accepted: written.length,
    flagged: flaggedCount,
    suspiciousLocationCount: booking.suspiciousLocationCount + flaggedCount,
  });
}
