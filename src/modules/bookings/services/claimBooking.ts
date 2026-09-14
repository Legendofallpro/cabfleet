/**
 * Concurrency-safe driver claim for an OPEN_FOR_CLAIM booking.
 *
 * Two-layer locking:
 *   1. SELECT FOR UPDATE SKIP LOCKED — only one transaction proceeds when
 *      multiple drivers claim simultaneously; the others get zero rows immediately.
 *   2. Booking.version optimistic-lock inside applyBookingTransitionTx — backstop
 *      against any code paths that might bypass the row lock.
 *
 * Returns:
 *   ok(booking)              — claim succeeded
 *   err("ALREADY_CLAIMED")   — another driver already claimed (or booking gone)
 */
import { BookingStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { err, ok, type Result } from "@/lib/result";
import { logger } from "@/lib/logger";
import { currentOrgId } from "@/lib/org-context";
import type { BookingDetail } from "@/modules/bookings/types";
import { applyBookingTransitionTx } from "@/modules/bookings/services/transitionBookingStatus";

type ClaimBookingInput = {
  bookingId: string;
  driverId: string;
  /** Profile id of the driver (= Driver.profileId) — used for audit log */
  byProfileId: string;
};

type RawBookingRow = { id: string; status: string; version: number };
const CLAIM_TX_MAX_WAIT_MS = 10_000;
const CLAIM_TX_TIMEOUT_MS = 15_000;

export async function claimBooking(
  input: ClaimBookingInput,
): Promise<Result<BookingDetail>> {
  const { bookingId, driverId, byProfileId } = input;
  const orgId = currentOrgId();

  const result = await db.$transaction(
    async (tx) => {
      // 1. Lock the booking row and check it is still OPEN_FOR_CLAIM.
      //    SKIP LOCKED means concurrent transactions that can't acquire the lock
      //    immediately return zero rows rather than waiting — fast-fail for drivers.
      const rows = await tx.$queryRaw<RawBookingRow[]>`
        SELECT id, status, version
        FROM "Booking"
        WHERE id = ${bookingId}
          AND status = 'OPEN_FOR_CLAIM'
          AND "deletedAt" IS NULL
          AND (${orgId}::text IS NULL OR "orgId" = ${orgId})
        FOR UPDATE SKIP LOCKED
      `;

      if (rows.length === 0) {
        // Either another driver won the race, or the booking no longer exists /
        // has already moved on. Bubble up as a typed error, not an exception.
        return err({ code: "ALREADY_CLAIMED", message: "This trip is no longer available." });
      }

      // 2. Apply the CLAIMED transition inside the same lock-holding transaction.
      //    applyBookingTransitionTx handles the optimistic-lock update, assignment
      //    history, audit log, and notification outbox atomically.
      const locked = rows[0];

      const booking = await applyBookingTransitionTx(
        tx,
        bookingId,
        {
          status: BookingStatus.OPEN_FOR_CLAIM,
          version: locked.version,
          // An OPEN_FOR_CLAIM booking has no assigned driver/vehicle yet;
          // these are null and not involved in the driverChanged/vehicleChanged
          // checks inside applyBookingTransitionTx.
          assignedDriverId: null,
          assignedVehicleId: null,
        },
        {
          toStatus: BookingStatus.CLAIMED,
          byProfileId,
          claimedByDriverId: driverId,
          reason: "Driver claimed open booking",
        },
      );

      return ok(booking);
    },
    {
      // Debug evidence showed P2028 "Unable to start a transaction in the given time"
      // at ~2s under burst load. Relax maxWait/timeout for claim bursts.
      maxWait: CLAIM_TX_MAX_WAIT_MS,
      timeout: CLAIM_TX_TIMEOUT_MS,
    },
  );

  if (!result.ok) {
    logger.info({ bookingId, driverId }, "booking.claim.already_taken");
  } else {
    logger.info({ bookingId, driverId, by: byProfileId }, "booking.claim.success");
  }

  return result;
}
