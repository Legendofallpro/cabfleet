"use server";

import { revalidatePath } from "next/cache";
import { BookingStatus } from "@prisma/client";

import { action } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/requireRole";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ok, err } from "@/lib/result";
import { getOrCreateCustomer } from "@/modules/customers/services/customer.service";
import {
  createBookingSchema,
  assignDriverSchema,
  cancelBookingSchema,
  transitionSchema,
  softDeleteBookingSchema,
} from "@/modules/bookings/validators/booking";
import {
  createBooking,
  assignDriverToBooking,
  cancelBooking,
  transitionByStaff,
} from "@/modules/bookings/services/booking.service";
import { softDeleteBooking } from "@/modules/bookings/services/softDeleteBooking";

// ──────────────────────────────────────────────────────────────────────────────
// Create
// ──────────────────────────────────────────────────────────────────────────────

export const createBookingAction = action(
  "bookings.create",
  createBookingSchema,
  async (input) => {
    const actor = await requirePermission(PERMISSIONS.BOOKING_CREATE);

    // IDOR guard: a CUSTOMER may only create bookings against their own
    // Customer row. Resolve it from the actor and override whatever the
    // client sent. ADMIN/STAFF keep the freedom to book on behalf of any
    // customer.
    let scopedInput = input;
    if (actor.profile.role === "CUSTOMER") {
      const customer = await getOrCreateCustomer(actor.profile.id);
      if (input.customerId && input.customerId !== customer.id) {
        return err({
          code: "FORBIDDEN",
          message: "You can only create bookings for yourself.",
        });
      }
      scopedInput = { ...input, customerId: customer.id };
    }

    const result = await createBooking(scopedInput, { id: actor.profile.id });
    revalidatePath("/bookings");
    // Return only the id — the full BookingDetail contains Prisma Decimal fields
    // which React cannot serialize across the server→client boundary.
    if (!result.ok) return result;
    return ok({ id: result.data.id });
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// Assign driver
// ──────────────────────────────────────────────────────────────────────────────

export const assignDriverAction = action(
  "bookings.assign",
  assignDriverSchema,
  async (input) => {
    const actor = await requirePermission(PERMISSIONS.BOOKING_ASSIGN);
    const result = await assignDriverToBooking(input, { id: actor.profile.id });
    revalidatePath("/bookings");
    revalidatePath(`/bookings/${input.bookingId}`);
    if (!result.ok) return result;
    return ok({ id: result.data.id });
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// Cancel
// ──────────────────────────────────────────────────────────────────────────────

export const cancelBookingAction = action(
  "bookings.cancel",
  cancelBookingSchema,
  async (input) => {
    const actor = await requirePermission(PERMISSIONS.BOOKING_CANCEL);
    const result = await cancelBooking(input, { id: actor.profile.id });
    revalidatePath("/bookings");
    revalidatePath(`/bookings/${input.bookingId}`);
    if (!result.ok) return result;
    return ok({ id: result.data.id });
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// Generic staff transition (en-route, in-progress, completed, failed, no-show)
// ──────────────────────────────────────────────────────────────────────────────

// Phase 4: OPEN_FOR_CLAIM added so staff can manually open a PENDING booking.
const staffTransitionStatuses = [
  BookingStatus.OPEN_FOR_CLAIM,
  BookingStatus.DRIVER_EN_ROUTE,
  BookingStatus.IN_PROGRESS,
  BookingStatus.COMPLETED,
  BookingStatus.FAILED,
  BookingStatus.NO_SHOW,
] as const;

export const transitionBookingAction = action(
  "bookings.transition",
  transitionSchema.refine(
    (d) => (staffTransitionStatuses as readonly BookingStatus[]).includes(d.toStatus),
    { message: "Use dedicated actions for ASSIGNED and CANCELLED transitions." },
  ),
  async (input) => {
    const actor = await requirePermission(PERMISSIONS.BOOKING_OVERRIDE);
    const result = await transitionByStaff(
      input.bookingId,
      input.toStatus,
      { id: actor.profile.id },
      input.reason,
    );
    revalidatePath("/bookings");
    revalidatePath(`/bookings/${input.bookingId}`);
    if (!result.ok) return result;
    return ok({ id: result.data.id });
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// Soft delete
// ──────────────────────────────────────────────────────────────────────────────

export const softDeleteBookingAction = action(
  "bookings.delete",
  softDeleteBookingSchema,
  async ({ bookingId }) => {
    const actor = await requirePermission(PERMISSIONS.BOOKING_OVERRIDE);
    const result = await softDeleteBooking(bookingId, { id: actor.profile.id });
    if (!result.ok) return result;
    revalidatePath("/bookings");
    return ok(true as const);
  },
);
