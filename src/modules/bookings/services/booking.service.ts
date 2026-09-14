import { BookingStatus, DispatchMode, DriverStatus, VehicleStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { ok, type Result } from "@/lib/result";
import { writeAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { estimateFare } from "@/modules/pricing/services/fareCalculator";
import { transitionBookingStatus } from "@/modules/bookings/services/transitionBookingStatus";
import { bookingDetailInclude } from "@/modules/bookings/includes";
import { resolveDispatchPolicy } from "@/modules/dispatch/services/resolveDispatchPolicy";
import type {
  CreateBookingInput,
  CreateDeskBookingInput,
  UpdatePendingBookingInput,
  AssignDriverInput,
  CancelBookingInput,
} from "@/modules/bookings/validators/booking";
import { findOrCreateStaffCustomer } from "@/modules/customers/services/customer.service";
import { isTerminalStatus } from "@/modules/bookings/booking.constants";
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
  const calculatorFare = await estimateFare({
    bookingTypeId: input.bookingTypeId,
    branchId: input.branchId,
    distanceKm: input.distanceKm ?? undefined,
  }).catch((e) => {
    logger.warn({ err: e }, "Fare estimation failed; continuing without estimate");
    return null;
  });

  const fareEstimate =
    input.quotedFare != null && input.quotedFare > 0
      ? input.quotedFare
      : (calculatorFare?.total ?? null);

  // Resolve dispatch policy — determines dispatchMode and initial status.
  // The form no longer sends dispatchMode; it is always set by this resolver.
  const policy = await resolveDispatchPolicy({
    branchId: input.branchId,
    bookingTypeId: input.bookingTypeId,
  }).catch((e) => {
    logger.warn({ err: e }, "Dispatch policy resolution failed; defaulting to MANUAL");
    return { mode: DispatchMode.MANUAL } as const;
  });

  const resolvedMode = policy.mode;

  // Compute claimTimeoutAt for HYBRID mode
  const claimTimeoutAt =
    resolvedMode === DispatchMode.HYBRID && policy.hybridTimeoutMins
      ? new Date(Date.now() + policy.hybridTimeoutMins * 60 * 1000)
      : null;

  const booking = await db.$transaction(async (tx) => {
    const created = await tx.booking.create({
      data: {
        branchId: input.branchId,
        customerId: input.customerId,
        bookingTypeId: input.bookingTypeId,
        dispatchMode: resolvedMode,
        status: BookingStatus.PENDING,
        pickupAt: input.pickupAt,
        pickupAddress: input.pickupAddress,
        pickupLandmark: input.pickupLandmark ?? null,
        dropAddress: input.dropAddress,
        dropLandmark: input.dropLandmark ?? null,
        notes: input.notes ?? null,
        distanceKm: input.distanceKm ?? null,
        passengers: input.passengers,
        fareEstimate,
        tollAmount: input.tollAmount ?? 0,
        parkingAmount: input.parkingAmount ?? 0,
        claimTimeoutAt,
        createdById: actor.id,
        // §W5 S15: capture the consent stamp at create time. Customers
        // who opt out simply don't get a live map; they (and ops) can
        // grant consent later via a dedicated action (TBD).
        locationConsentAt: input.locationConsent ? new Date() : null,
        version: 0,
      },
      include: bookingDetailInclude,
    });

    await writeAudit(tx, {
      entity: "Booking",
      entityId: created.id,
      action: "CREATE",
      byProfileId: actor.id,
      diff: {
        after: {
          status: BookingStatus.PENDING,
          dispatchMode: resolvedMode,
          fareEstimate,
          claimTimeoutAt,
        },
      },
    });

    return created as BookingDetail;
  });

  logger.info(
    { bookingId: booking.id, by: actor.id, dispatchMode: resolvedMode },
    "booking.create",
  );

  // For CLAIM mode, immediately open the booking for drivers to claim.
  if (resolvedMode === DispatchMode.CLAIM) {
    const transitioned = await transitionBookingStatus(booking.id, {
      toStatus: BookingStatus.OPEN_FOR_CLAIM,
      byProfileId: actor.id,
      reason: "Auto-opened for driver claim (CLAIM dispatch mode)",
    });
    if (transitioned.ok) return ok(transitioned.data);
    // If transition fails (race), return the PENDING booking — staff can promote manually.
    logger.warn({ bookingId: booking.id }, "dispatch.claim.auto_open_failed");
  }

  return ok(booking);
}

export async function createDeskBooking(
  input: CreateDeskBookingInput,
  actor: Actor,
): Promise<Result<BookingDetail>> {
  const customerResult = await findOrCreateStaffCustomer(
    { phone: input.phone, fullName: input.fullName },
    actor,
  );
  if (!customerResult.ok) return customerResult;

  return createBooking(
    {
      branchId: input.branchId,
      customerId: customerResult.data.id,
      bookingTypeId: input.bookingTypeId,
      pickupAt: input.pickupAt,
      pickupAddress: input.pickupAddress,
      pickupLandmark: input.pickupLandmark,
      dropAddress: input.dropAddress,
      dropLandmark: input.dropLandmark,
      distanceKm: input.distanceKm,
      passengers: input.passengers,
      notes: input.notes,
      quotedFare: input.quotedFare,
      tollAmount: input.tollAmount,
      parkingAmount: input.parkingAmount,
      locationConsent: input.locationConsent,
    },
    actor,
  );
}

export async function updatePendingBooking(
  input: UpdatePendingBookingInput,
  actor: Actor,
  opts?: { customerProfileId?: string },
): Promise<Result<BookingDetail>> {
  const booking = await db.booking.findFirst({
    where: { id: input.bookingId, deletedAt: null },
    select: {
      id: true,
      status: true,
      branchId: true,
      bookingTypeId: true,
      customer: { select: { profileId: true } },
    },
  });
  if (!booking) {
    throw new AppError("NOT_FOUND", "Booking not found.");
  }
  if (booking.status !== BookingStatus.PENDING) {
    throw new AppError("VALIDATION", "Only pending bookings can be edited.");
  }
  if (opts?.customerProfileId && booking.customer.profileId !== opts.customerProfileId) {
    throw new AppError("FORBIDDEN", "You can only edit your own booking.");
  }

  const isCustomerEdit = Boolean(opts?.customerProfileId);

  const calculatorFare = isCustomerEdit
    ? null
    : await estimateFare({
        bookingTypeId: booking.bookingTypeId,
        branchId: booking.branchId,
        distanceKm: input.distanceKm ?? undefined,
      }).catch(() => null);

  const fareEstimate =
    !isCustomerEdit && input.quotedFare != null && input.quotedFare > 0
      ? input.quotedFare
      : (calculatorFare?.total ?? undefined);

  const updated = await db.$transaction(async (tx) => {
    const saved = await tx.booking.update({
      where: { id: booking.id },
      data: {
        pickupAt: input.pickupAt,
        pickupAddress: input.pickupAddress,
        pickupLandmark: input.pickupLandmark ?? null,
        dropAddress: input.dropAddress,
        dropLandmark: input.dropLandmark ?? null,
        notes: input.notes ?? null,
        distanceKm: input.distanceKm ?? null,
        passengers: input.passengers,
        ...(isCustomerEdit
          ? {}
          : {
              fareEstimate: fareEstimate ?? null,
              tollAmount: input.tollAmount ?? 0,
              parkingAmount: input.parkingAmount ?? 0,
            }),
      },
      include: bookingDetailInclude,
    });

    await writeAudit(tx, {
      entity: "Booking",
      entityId: saved.id,
      action: "UPDATE",
      byProfileId: actor.id,
      diff: {
        after: {
          pickupAt: saved.pickupAt,
          pickupAddress: saved.pickupAddress,
          dropAddress: saved.dropAddress,
          fareEstimate: saved.fareEstimate,
        },
      },
    });

    return saved as BookingDetail;
  });

  logger.info({ bookingId: updated.id, by: actor.id }, "booking.update_pending");
  return ok(updated);
}

// ──────────────────────────────────────────────────────────────────────────────
// Assign driver + vehicle (PENDING → ASSIGNED)
// ──────────────────────────────────────────────────────────────────────────────

export async function assignDriverToBooking(
  input: AssignDriverInput,
  actor: Actor,
): Promise<Result<BookingDetail>> {
  const booking = await db.booking.findFirst({
    where: { id: input.bookingId, deletedAt: null },
    select: { id: true, branchId: true },
  });
  if (!booking) {
    throw new AppError("NOT_FOUND", "Booking not found.");
  }

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
  if (driver.profile.branchId !== booking.branchId) {
    throw new AppError("VALIDATION", "Driver is not available for this booking.", {
      fieldErrors: { driverId: ["Driver must belong to the booking branch"] },
    });
  }

  // Validate vehicle exists and is available
  const vehicle = await db.vehicle.findFirst({
    where: { id: input.vehicleId, deletedAt: null },
    select: { id: true, branchId: true, status: true },
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
  if (vehicle.branchId !== booking.branchId) {
    throw new AppError("VALIDATION", "Vehicle is not available for this booking.", {
      fieldErrors: { vehicleId: ["Vehicle must belong to the booking branch"] },
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

// ──────────────────────────────────────────────────────────────────────────────
// Location consent (does not change status)
// ──────────────────────────────────────────────────────────────────────────────

export async function grantLocationConsent(
  bookingId: string,
  actor: Actor & { customerId: string },
): Promise<Result<{ id: string }>> {
  const booking = await db.booking.findFirst({
    where: { id: bookingId, customerId: actor.customerId, deletedAt: null },
    select: { id: true, status: true, locationConsentAt: true },
  });
  if (!booking) {
    throw new AppError("NOT_FOUND", "Booking not found.");
  }
  if (isTerminalStatus(booking.status)) {
    throw new AppError("VALIDATION", "This trip has already ended.");
  }
  if (booking.locationConsentAt) {
    return ok({ id: booking.id });
  }

  await db.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: booking.id },
      data: { locationConsentAt: new Date() },
    });
    await writeAudit(tx, {
      entity: "Booking",
      entityId: booking.id,
      action: "UPDATE",
      byProfileId: actor.id,
      diff: { after: { locationConsentAt: true } },
    });
  });

  logger.info({ bookingId: booking.id, by: actor.id }, "booking.location_consent");
  return ok({ id: booking.id });
}
