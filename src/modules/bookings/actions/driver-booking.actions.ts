"use server";

import { revalidatePath } from "next/cache";
import { BookingStatus, DriverStatus } from "@prisma/client";
import { z } from "zod";

import { action } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/requireRole";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { err, ok } from "@/lib/result";
import { transitionBookingStatus } from "@/modules/bookings/services/transitionBookingStatus";
import { claimBooking } from "@/modules/bookings/services/claimBooking";

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Resolves the Driver record for the currently signed-in profile.
 * Includes the profile's branchId so eligibility can be checked per-claim.
 */
async function getDriverForProfile(profileId: string) {
  const driver = await db.driver.findUnique({
    where: { profileId },
    select: {
      id: true,
      status: true,
      profile: { select: { branchId: true } },
    },
  });
  if (!driver) {
    throw new AppError("FORBIDDEN", "No driver profile found for this account.");
  }
  return driver;
}

// ──────────────────────────────────────────────────────────────────────────────
// Claim an OPEN_FOR_CLAIM booking
// ──────────────────────────────────────────────────────────────────────────────

const claimBookingSchema = z.object({ bookingId: z.string().min(1) });

export const claimBookingAction = action(
  "bookings.driver.claim",
  claimBookingSchema,
  async ({ bookingId }) => {
    const actor = await requirePermission(PERMISSIONS.BOOKING_CLAIM);
    const driver = await getDriverForProfile(actor.profile.id);

    // Eligibility: only ACTIVE or ON_LEAVE drivers may claim
    if (
      driver.status === DriverStatus.SUSPENDED ||
      driver.status === DriverStatus.INACTIVE
    ) {
      return err({
        code: "FORBIDDEN",
        message: "Your account is not eligible to claim trips.",
      });
    }

    // Branch eligibility: driver's branch must match the booking's branch
    const booking = await db.booking.findFirst({
      where: { id: bookingId, deletedAt: null },
      select: { branchId: true },
    });
    if (!booking) {
      return err({ code: "NOT_FOUND", message: "Booking not found." });
    }
    if (driver.profile.branchId !== booking.branchId) {
      return err({
        code: "FORBIDDEN",
        message: "You can only claim trips in your assigned branch.",
      });
    }

    const result = await claimBooking({
      bookingId,
      driverId: driver.id,
      byProfileId: actor.profile.id,
    });

    revalidatePath("/driver/trips/open");
    revalidatePath("/driver/trips/my");
    revalidatePath(`/driver/trips/${bookingId}`);

    if (!result.ok) return result;
    return ok({ id: result.data.id });
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// Driver status transitions: en-route, in-progress, completed, no-show
// Drivers can only advance their OWN trips.
// ──────────────────────────────────────────────────────────────────────────────

const DRIVER_ALLOWED_TARGETS = [
  BookingStatus.DRIVER_EN_ROUTE,
  BookingStatus.IN_PROGRESS,
  BookingStatus.COMPLETED,
  BookingStatus.NO_SHOW,
] as const;

const driverTransitionSchema = z.object({
  bookingId: z.string().min(1),
  toStatus: z.enum(BookingStatus),
  reason: z.string().max(300).optional(),
});

export const driverTransitionAction = action(
  "bookings.driver.transition",
  driverTransitionSchema.refine(
    (d) => (DRIVER_ALLOWED_TARGETS as readonly BookingStatus[]).includes(d.toStatus),
    { message: "Drivers can only transition to DRIVER_EN_ROUTE, IN_PROGRESS, COMPLETED, or NO_SHOW." },
  ),
  async (input) => {
    const actor = await requirePermission(PERMISSIONS.BOOKING_VIEW);
    const driver = await getDriverForProfile(actor.profile.id);

    // Ownership check: only the assigned driver may advance the trip
    const booking = await db.booking.findFirst({
      where: {
        id: input.bookingId,
        deletedAt: null,
        OR: [
          { claimedByDriverId: driver.id },
          { assignedDriverId: driver.id },
        ],
      },
      select: { id: true },
    });
    if (!booking) {
      return err({ code: "FORBIDDEN", message: "You are not assigned to this booking." });
    }

    const result = await transitionBookingStatus(input.bookingId, {
      toStatus: input.toStatus,
      byProfileId: actor.profile.id,
      reason: input.reason,
    });

    revalidatePath("/driver/trips/my");
    revalidatePath(`/driver/trips/${input.bookingId}`);

    if (!result.ok) return result;
    return ok({ id: result.data.id });
  },
);
