/**
 * The single entry point for every Booking status change.
 *
 * Rules:
 *  - Validates the transition is allowed from the current status.
 *  - Updates the booking with optimistic-locking (WHERE id = ? AND version = ?).
 *  - Increments `version` on every write.
 *  - Writes AssignmentHistory if driver/vehicle changed or a CLAIM occurred.
 *  - Writes AuditLog inside the same transaction.
 *
 * NEVER call db.booking.update({ status }) directly from anywhere else.
 */
import { BookingStatus, type AuditAction, type Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { ok, type Result } from "@/lib/result";
import { writeAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import type { BookingDetail } from "@/modules/bookings/types";
import { bookingDetailInclude } from "@/modules/bookings/includes";
import { notifyOnTransition } from "@/modules/notifications/services/notifyOnTransition";
import { assertCanCompleteTrip } from "@/modules/tracking/services/policy";

// Pure constants live in booking.constants.ts (no server imports) so client
// components can import them without pulling in the pg/Prisma bundle.
export {
  BOOKING_STATUS_LABEL,
  DISPATCH_MODE_LABEL,
  STAFF_MANUAL_TRANSITIONS,
  isTerminalStatus,
} from "@/modules/bookings/booking.constants";

// ──────────────────────────────────────────────────────────────────────────────
// State machine definition
// Entries not listed here = terminal states (no transitions allowed from them).
// ──────────────────────────────────────────────────────────────────────────────

const ALLOWED_TRANSITIONS: Partial<Record<BookingStatus, BookingStatus[]>> = {
  PENDING: [BookingStatus.ASSIGNED, BookingStatus.OPEN_FOR_CLAIM, BookingStatus.CANCELLED],
  OPEN_FOR_CLAIM: [BookingStatus.CLAIMED, BookingStatus.CANCELLED],
  CLAIMED: [BookingStatus.ASSIGNED, BookingStatus.CANCELLED],
  ASSIGNED: [BookingStatus.DRIVER_EN_ROUTE, BookingStatus.CANCELLED],
  DRIVER_EN_ROUTE: [BookingStatus.IN_PROGRESS, BookingStatus.NO_SHOW],
  IN_PROGRESS: [BookingStatus.COMPLETED, BookingStatus.FAILED],
};

/** canTransition is available for server-side logic checks. */
export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

// ──────────────────────────────────────────────────────────────────────────────
// Options
// ──────────────────────────────────────────────────────────────────────────────

export type TransitionOptions = {
  toStatus: BookingStatus;
  /**
   * Profile ID of the actor triggering this transition.
   * Pass null for system-initiated transitions (cron jobs, automated rules)
   * so that the AuditLog row has no FK reference to a non-existent profile.
   */
  byProfileId: string | null;
  reason?: string;
  /** Set when transitioning to ASSIGNED with a driver. */
  assignedDriverId?: string | null;
  /** Set when transitioning to ASSIGNED with a vehicle. */
  assignedVehicleId?: string | null;
  /** Staff member who performed the assignment. */
  assignedByStaffId?: string | null;
  /** Phase 4: driver who claimed the booking. */
  claimedByDriverId?: string | null;
};

// ──────────────────────────────────────────────────────────────────────────────
// In-transaction core — shared by transitionBookingStatus and claimBooking
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Snapshot of the booking loaded before the transaction starts.
 * Only the fields needed inside the transaction body are required.
 */
export type TxCurrentBooking = {
  status: BookingStatus;
  version: number;
  assignedDriverId: string | null;
  assignedVehicleId: string | null;
};

/**
 * Executes the booking transition writes inside an already-open transaction.
 * Callers are responsible for validation before calling this function.
 *
 * Used by:
 *  - `transitionBookingStatus` (standard path — opens its own transaction)
 *  - `claimBooking` (concurrency path — uses SELECT FOR UPDATE SKIP LOCKED
 *     and calls this inside the same lock-holding transaction)
 */
export async function applyBookingTransitionTx(
  tx: Prisma.TransactionClient,
  bookingId: string,
  current: TxCurrentBooking,
  opts: TransitionOptions,
): Promise<BookingDetail> {
  const now = new Date();
  const toStatus = opts.toStatus;

  const driverChanged =
    opts.assignedDriverId !== undefined &&
    opts.assignedDriverId !== current.assignedDriverId;
  const vehicleChanged =
    opts.assignedVehicleId !== undefined &&
    opts.assignedVehicleId !== current.assignedVehicleId;
  const isClaimTransition =
    toStatus === BookingStatus.CLAIMED && opts.claimedByDriverId != null;

  const auditAction: AuditAction =
    toStatus === BookingStatus.CANCELLED
      ? "CANCEL"
      : toStatus === BookingStatus.COMPLETED
        ? "COMPLETE"
        : isClaimTransition
          ? "CLAIM"
          : driverChanged || vehicleChanged
            ? "ASSIGN"
            : "STATUS_CHANGE";

  const updateData: Record<string, unknown> = {
    status: toStatus,
    version: { increment: 1 },
    updatedAt: now,
  };

  if (toStatus === BookingStatus.ASSIGNED) {
    if (opts.assignedDriverId !== undefined) updateData.assignedDriverId = opts.assignedDriverId;
    if (opts.assignedVehicleId !== undefined) updateData.assignedVehicleId = opts.assignedVehicleId;
    if (opts.assignedByStaffId !== undefined) updateData.assignedByStaffId = opts.assignedByStaffId;
    updateData.assignedAt = now;
  }

  if (toStatus === BookingStatus.CLAIMED) {
    if (opts.claimedByDriverId !== undefined) updateData.claimedByDriverId = opts.claimedByDriverId;
    updateData.claimedAt = now;
  }

  const updated = await tx.booking.update({
    where: { id: bookingId, version: current.version },
    data: updateData,
    include: bookingDetailInclude,
  });

  if (driverChanged || vehicleChanged || isClaimTransition) {
    await tx.assignmentHistory.create({
      data: {
        bookingId,
        driverId: isClaimTransition
          ? opts.claimedByDriverId!
          : (opts.assignedDriverId ?? current.assignedDriverId ?? null),
        vehicleId: opts.assignedVehicleId ?? current.assignedVehicleId ?? null,
        action: auditAction,
        byProfileId: opts.byProfileId,
        reason: opts.reason ?? null,
        at: now,
      },
    });
  }

  await writeAudit(tx, {
    entity: "Booking",
    entityId: bookingId,
    action: auditAction,
    byProfileId: opts.byProfileId,
    diff: {
      before: { status: current.status, version: current.version },
      after: { status: toStatus, version: current.version + 1 },
      reason: opts.reason,
    },
  });

  await notifyOnTransition(tx, {
    prev: current.status,
    next: toStatus,
    booking: updated as BookingDetail,
    reason: opts.reason,
  });

  return updated as BookingDetail;
}

// ──────────────────────────────────────────────────────────────────────────────
// Public API — standard (non-concurrency) path
// ──────────────────────────────────────────────────────────────────────────────

export async function transitionBookingStatus(
  bookingId: string,
  opts: TransitionOptions,
): Promise<Result<BookingDetail>> {
  const current = await db.booking.findFirst({
    where: { id: bookingId, deletedAt: null },
    select: {
      status: true,
      version: true,
      assignedDriverId: true,
      assignedVehicleId: true,
      suspiciousLocationCount: true,
    },
  });
  if (!current) {
    throw new AppError("NOT_FOUND", "Booking not found.");
  }

  if (!canTransition(current.status, opts.toStatus)) {
    throw new AppError(
      "VALIDATION",
      `Cannot transition booking from ${current.status} to ${opts.toStatus}.`,
    );
  }

  if (opts.toStatus === BookingStatus.COMPLETED) {
    assertCanCompleteTrip({
      bookingId,
      suspiciousLocationCount: current.suspiciousLocationCount,
    });
  }

  const booking = await db.$transaction(async (tx) => {
    return applyBookingTransitionTx(tx, bookingId, current, opts);
  }).catch((e: unknown) => {
    const errMsg = e instanceof Error ? e.message : String(e);
    if (errMsg.includes("P2025")) {
      throw new AppError(
        "CONFLICT",
        "This booking was updated by another user. Please refresh and try again.",
      );
    }
    logger.error({ err: e, bookingId, toStatus: opts.toStatus }, "transitionBookingStatus failed");
    throw e;
  });

  logger.info(
    { bookingId, from: current.status, to: opts.toStatus, by: opts.byProfileId },
    "booking.transition",
  );

  return ok(booking);
}
