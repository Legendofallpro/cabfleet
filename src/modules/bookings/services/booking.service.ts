import { BookingStatus, DriverStatus, VehicleStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { ok, type Result } from "@/lib/result";
import { writeAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { estimateFare } from "@/modules/pricing/services/fareCalculator";
import {
  transitionBookingStatus,
  bookingDetailInclude,
} from "@/modules/bookings/services/transitionBookingStatus";
import type {
  CreateBookingInput,
  AssignDriverInput,
  CancelBookingInput,
} from "@/modules/bookings/validators/booking";
import type { BookingDetail } from "@/modules/bookings/types";

type Actor = { id: string };

// ──────────────────────────────────────────────────────────────────────────────
// Create
// ──────────────────────────────────────────────────────────────────────────────

export async function createBooking(
  input: CreateBookingInput,
  actor: Actor,
): Promise<Result<BookingDetail>> {
  // Pre-flight checks
  const [branch, customer, bookingType] = await Promise.all([
    db.branch.findFirst({ where: { id: input.branchId, deletedAt: null } }),
    db.customer.findFirst({ where: { id: input.customerId, deletedAt: null } }),
    db.bookingType.findFirst({ where: { id: input.bookingTypeId, deletedAt: null } }),
  ]);

  if (!branch) {
    throw new AppError("VALIDATION", "Branch not found.", {
      fieldErrors: { branchId: ["Branch not found or inactive"] },
    });
  }
  if (!customer) {
    throw new AppError("VALIDATION", "Customer not found.", {
      fieldErrors: { customerId: ["Customer not found"] },
    });
  }
  if (!bookingType) {
    throw new AppError("VALIDATION", "Booking type not found.", {
      fieldErrors: { bookingTypeId: ["Booking type not found"] },
    });
  }

  // Estimate fare (non-blocking — proceed even if no rule exists)
  const fare = await estimateFare({
    bookingTypeId: input.bookingTypeId,
    branchId: input.branchId,
    distanceKm: input.distanceKm ?? undefined,
  }).catch((e) => {
    logger.warn({ err: e }, "Fare estimation failed; continuing without estimate");
    return null;
  });

  const booking = await db.$transaction(async (tx) => {
    const created = await tx.booking.create({
      data: {
        branchId: input.branchId,
        customerId: input.customerId,
        bookingTypeId: input.bookingTypeId,
        dispatchMode: input.dispatchMode,
        status: BookingStatus.PENDING,
        pickupAt: input.pickupAt,
        pickupAddress: input.pickupAddress,
        dropAddress: input.dropAddress,
        distanceKm: input.distanceKm ?? null,
        passengers: input.passengers,
        fareEstimate: fare?.total ?? null,
        createdById: actor.id,
        version: 0,
      },
      include: bookingDetailInclude,
    });

    await writeAudit(tx, {
      entity: "Booking",
      entityId: created.id,
      action: "CREATE",
      byProfileId: actor.id,
      diff: { after: { status: BookingStatus.PENDING, fareEstimate: fare?.total } },
    });

    return created as BookingDetail;
  });

  logger.info({ bookingId: booking.id, by: actor.id }, "booking.create");
  return ok(booking);
}

// ──────────────────────────────────────────────────────────────────────────────
// Assign driver + vehicle (PENDING → ASSIGNED)
// ──────────────────────────────────────────────────────────────────────────────

export async function assignDriverToBooking(
  input: AssignDriverInput,
  actor: Actor,
): Promise<Result<BookingDetail>> {
  // Validate driver exists and is active
  const driver = await db.driver.findFirst({
    where: { id: input.driverId, deletedAt: null },
    include: { profile: { select: { branchId: true } } },
  });
  if (!driver) {
    throw new AppError("VALIDATION", "Driver not found.", {
      fieldErrors: { driverId: ["Driver not found or inactive"] },
    });
  }
  if (driver.status === DriverStatus.SUSPENDED || driver.status === DriverStatus.INACTIVE) {
    throw new AppError("VALIDATION", "Driver is not available for assignment.", {
      fieldErrors: { driverId: ["Driver must be ACTIVE or ON_LEAVE to be assigned"] },
    });
  }

  // Validate vehicle exists and is available
  const vehicle = await db.vehicle.findFirst({
    where: { id: input.vehicleId, deletedAt: null },
  });
  if (!vehicle) {
    throw new AppError("VALIDATION", "Vehicle not found.", {
      fieldErrors: { vehicleId: ["Vehicle not found"] },
    });
  }
  if (vehicle.status === VehicleStatus.MAINTENANCE || vehicle.status === VehicleStatus.INACTIVE) {
    throw new AppError("VALIDATION", "Vehicle is not available.", {
      fieldErrors: { vehicleId: ["Vehicle must be AVAILABLE or ON_TRIP"] },
    });
  }

  return transitionBookingStatus(input.bookingId, {
    toStatus: BookingStatus.ASSIGNED,
    byProfileId: actor.id,
    reason: input.reason,
    assignedDriverId: input.driverId,
    assignedVehicleId: input.vehicleId,
    assignedByStaffId: actor.id,
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Cancel
// ──────────────────────────────────────────────────────────────────────────────

export async function cancelBooking(
  input: CancelBookingInput,
  actor: Actor,
): Promise<Result<BookingDetail>> {
  return transitionBookingStatus(input.bookingId, {
    toStatus: BookingStatus.CANCELLED,
    byProfileId: actor.id,
    reason: input.reason,
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Generic staff transition (en-route, in-progress, complete, fail, no-show)
// ──────────────────────────────────────────────────────────────────────────────

export async function transitionByStaff(
  bookingId: string,
  toStatus: BookingStatus,
  actor: Actor,
  reason?: string,
): Promise<Result<BookingDetail>> {
  // Restrict transitions that need special data (assign) to use the dedicated fn
  if (toStatus === BookingStatus.ASSIGNED) {
    throw new AppError(
      "VALIDATION",
      "Use assignDriverToBooking to transition to ASSIGNED.",
    );
  }

  return transitionBookingStatus(bookingId, {
    toStatus,
    byProfileId: actor.id,
    reason,
  });
}
