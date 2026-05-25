/**
 * Concurrency-safe driver claim for an OPEN_FOR_CLAIM booking.
 *
 * Two-layer locking:
 *   1. SELECT FOR UPDATE SKIP LOCKED — only one transaction proceeds when
 *      multiple drivers claim simultaneously; the others get zero rows immediately.
 *   2. Booking.version optimistic-lock in transitionBookingStatus — backstop
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
import type { BookingDetail } from "@/modules/bookings/types";

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
        FOR UPDATE SKIP LOCKED
      `;

      if (rows.length === 0) {
        // Either another driver won the race, or the booking no longer exists /
        // has already moved on. Bubble up as a typed error, not an exception.
        return err({ code: "ALREADY_CLAIMED", message: "This trip is no longer available." });
      }

      // 2. Transition to CLAIMED — this runs inside the same transaction and
      //    uses the optimistic-lock (WHERE id = ? AND version = ?) as backstop.
      //    Note: transitionBookingStatus opens its OWN db.$transaction internally,
      //    but since we're already inside a transaction the outer one wins in Prisma
      //    with the PgBouncer adapter (nested transactions become savepoints).
      //    To avoid nested transaction issues we call the raw update directly here
      //    and write the audit + assignment history ourselves.

      const locked = rows[0];
      const now = new Date();

      const updated = await tx.booking.update({
        where: { id: bookingId, version: locked.version },
        data: {
          status: BookingStatus.CLAIMED,
          claimedByDriverId: driverId,
          claimedAt: now,
          version: { increment: 1 },
          updatedAt: now,
        },
        include: {
          branch: { select: { id: true, name: true, code: true } },
          customer: {
            include: {
              profile: { select: { id: true, fullName: true, email: true, phone: true } },
            },
          },
          bookingType: { select: { id: true, name: true, defaultDispatchMode: true } },
          assignedDriver: {
            include: {
              profile: { select: { id: true, fullName: true, email: true, phone: true } },
            },
          },
          assignedVehicle: {
            select: { id: true, registrationNumber: true, make: true, model: true },
          },
          claimedBy: {
            include: {
              profile: { select: { id: true, fullName: true, email: true } },
            },
          },
          assignedBy: { select: { id: true, fullName: true, email: true } },
          createdBy: { select: { id: true, fullName: true, email: true } },
          assignmentHistory: {
            orderBy: { at: "desc" as const },
            include: {
              byProfile: { select: { id: true, fullName: true, email: true } },
            },
          },
        },
      });

      // 3. Write AssignmentHistory for the claim event
      await tx.assignmentHistory.create({
        data: {
          bookingId,
          driverId,
          action: "CLAIM",
          byProfileId,
          reason: "Driver claimed open booking",
          at: now,
        },
      });

      // 4. Write AuditLog inside the same transaction
      await tx.auditLog.create({
        data: {
          entity: "Booking",
          entityId: bookingId,
          action: "CLAIM",
          byProfileId,
          diff: {
            before: { status: BookingStatus.OPEN_FOR_CLAIM, version: locked.version },
            after: {
              status: BookingStatus.CLAIMED,
              version: locked.version + 1,
              claimedByDriverId: driverId,
            },
          },
        },
      });

      return ok(updated as BookingDetail);
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
