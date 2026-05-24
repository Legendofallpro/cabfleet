/**
 * The single entry point for every Booking status change.
 *
 * Rules:
 *  - Validates the transition is allowed from the current status.
 *  - Updates the booking with optimistic-locking (WHERE id = ? AND version = ?).
 *  - Increments `version` on every write.
 *  - Writes AssignmentHistory if driver or vehicle changed.
 *  - Writes AuditLog inside the same transaction.
 *
 * NEVER call db.booking.update({ status }) directly from anywhere else.
 */
import { BookingStatus, DispatchMode, type AuditAction } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { ok, type Result } from "@/lib/result";
import { writeAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import type { BookingDetail } from "@/modules/bookings/types";

// ──────────────────────────────────────────────────────────────────────────────
// State machine definition
// Entries not listed here = terminal states (no transitions allowed from them).
// Phase 4 will add OPEN_FOR_CLAIM, CLAIMED paths.
// ──────────────────────────────────────────────────────────────────────────────

const ALLOWED_TRANSITIONS: Partial<Record<BookingStatus, BookingStatus[]>> = {
  PENDING: [BookingStatus.ASSIGNED, BookingStatus.OPEN_FOR_CLAIM, BookingStatus.CANCELLED],
  OPEN_FOR_CLAIM: [BookingStatus.CLAIMED, BookingStatus.CANCELLED],
  CLAIMED: [BookingStatus.ASSIGNED, BookingStatus.CANCELLED],
  ASSIGNED: [BookingStatus.DRIVER_EN_ROUTE, BookingStatus.CANCELLED],
  DRIVER_EN_ROUTE: [BookingStatus.IN_PROGRESS, BookingStatus.NO_SHOW],
  IN_PROGRESS: [BookingStatus.COMPLETED, BookingStatus.FAILED],
};

/** Which statuses are terminal (no further transitions). */
export function isTerminalStatus(status: BookingStatus): boolean {
  return !(status in ALLOWED_TRANSITIONS);
}

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

// ──────────────────────────────────────────────────────────────────────────────
// Options
// ──────────────────────────────────────────────────────────────────────────────

export type TransitionOptions = {
  toStatus: BookingStatus;
  byProfileId: string;
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
// Main function
// ──────────────────────────────────────────────────────────────────────────────

export async function transitionBookingStatus(
  bookingId: string,
  opts: TransitionOptions,
): Promise<Result<BookingDetail>> {
  // 1. Load current state (outside transaction — cheap pre-check)
  const current = await db.booking.findFirst({
    where: { id: bookingId, deletedAt: null },
  });
  if (!current) {
    throw new AppError("NOT_FOUND", "Booking not found.");
  }

  // 2. Validate transition is allowed
  if (!canTransition(current.status, opts.toStatus)) {
    throw new AppError(
      "VALIDATION",
      `Cannot transition booking from ${current.status} to ${opts.toStatus}.`,
    );
  }

  // 3. Determine what changed for audit and assignment history
  const driverChanged =
    opts.assignedDriverId !== undefined &&
    opts.assignedDriverId !== current.assignedDriverId;
  const vehicleChanged =
    opts.assignedVehicleId !== undefined &&
    opts.assignedVehicleId !== current.assignedVehicleId;

  const toStatus = opts.toStatus;
  const auditAction: AuditAction =
    toStatus === BookingStatus.CANCELLED
      ? "CANCEL"
      : toStatus === BookingStatus.COMPLETED
        ? "COMPLETE"
        : driverChanged || vehicleChanged
          ? "ASSIGN"
          : "STATUS_CHANGE";

  const now = new Date();

  // 4. Build the update data
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

  // 5. Execute transaction
  const booking = await db.$transaction(async (tx) => {
    // Optimistic lock: ensure the row hasn't been updated since we read it
    const updated = await tx.booking.update({
      where: { id: bookingId, version: current.version },
      data: updateData,
      include: bookingDetailInclude,
    });

    // Write AssignmentHistory if driver or vehicle changed
    if (driverChanged || vehicleChanged) {
      await tx.assignmentHistory.create({
        data: {
          bookingId,
          driverId: opts.assignedDriverId ?? current.assignedDriverId ?? null,
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

    return updated as BookingDetail;
  }).catch((e: unknown) => {
    // Prisma throws P2025 when the WHERE clause matches nothing (optimistic lock miss)
    const errMsg = e instanceof Error ? e.message : String(e);
    if (errMsg.includes("P2025")) {
      throw new AppError(
        "CONFLICT",
        "This booking was updated by another user. Please refresh and try again.",
      );
    }
    logger.error({ err: e, bookingId, toStatus }, "transitionBookingStatus failed");
    throw e;
  });

  logger.info(
    { bookingId, from: current.status, to: toStatus, by: opts.byProfileId },
    "booking.transition",
  );

  return ok(booking);
}

// ──────────────────────────────────────────────────────────────────────────────
// Shared Prisma include clause — used by transition + queries
// ──────────────────────────────────────────────────────────────────────────────

export const bookingDetailInclude = {
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
} as const;

/** Shorthand: valid statuses that staff can transition to manually. */
export const STAFF_MANUAL_TRANSITIONS: Partial<Record<BookingStatus, BookingStatus[]>> = {
  PENDING: [BookingStatus.CANCELLED],
  ASSIGNED: [BookingStatus.DRIVER_EN_ROUTE, BookingStatus.CANCELLED],
  DRIVER_EN_ROUTE: [BookingStatus.IN_PROGRESS, BookingStatus.NO_SHOW],
  IN_PROGRESS: [BookingStatus.COMPLETED, BookingStatus.FAILED],
};

/** Human-readable label for each status. */
export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING: "Pending",
  OPEN_FOR_CLAIM: "Open for Claim",
  CLAIMED: "Claimed",
  ASSIGNED: "Assigned",
  DRIVER_EN_ROUTE: "Driver En Route",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
  FAILED: "Failed",
};

/** Human-readable label for dispatch mode. */
export const DISPATCH_MODE_LABEL: Record<DispatchMode, string> = {
  MANUAL: "Manual",
  CLAIM: "Claim",
  HYBRID: "Hybrid",
};
