"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { BookingStatus } from "@prisma/client";

import { action } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/requireRole";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { err, ok } from "@/lib/result";
import { transitionBookingStatus } from "@/modules/bookings/services/transitionBookingStatus";
import { claimBooking } from "@/modules/bookings/services/claimBooking";
import { DRIVER_ALLOWED_TARGETS } from "@/modules/bookings/booking.constants";
import {
  ensureCanClaim,
  getDriverForProfile,
} from "@/modules/drivers/services/eligibility";

// ──────────────────────────────────────────────────────────────────────────────
// Claim an OPEN_FOR_CLAIM booking
// ──────────────────────────────────────────────────────────────────────────────

const claimBookingSchema = z.object({ bookingId: z.string().min(1) });

export const claimBookingAction = action(
  "bookings.driver.claim",
  claimBookingSchema,
  async ({ bookingId }) => {
    const actor = await requirePermission(PERMISSIONS.BOOKING_CLAIM);
    const eligibility = await ensureCanClaim(actor.profile.id, bookingId);
    if (!eligibility.ok) return eligibility;

    const result = await claimBooking({
      bookingId,
      driverId: eligibility.data.id,
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

const driverTransitionSchema = z.object({
  bookingId: z.string().min(1),
  toStatus: z.enum(BookingStatus),
  reason: z.string().max(300).optional(),
});

export const driverTransitionAction = action(
  "bookings.driver.transition",
  driverTransitionSchema.refine(
    (d) => DRIVER_ALLOWED_TARGETS.includes(d.toStatus),
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
