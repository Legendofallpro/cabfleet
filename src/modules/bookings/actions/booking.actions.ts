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
  createDeskBookingSchema,
  updatePendingBookingSchema,
  estimateFareSchema,
  assignDriverSchema,
  cancelBookingSchema,
  transitionSchema,
  softDeleteBookingSchema,
} from "@/modules/bookings/validators/booking";
import {
  createBooking,
  createDeskBooking,
  updatePendingBooking,
  assignDriverToBooking,
  cancelBooking,
  transitionByStaff,
} from "@/modules/bookings/services/booking.service";
import { estimateFare } from "@/modules/pricing/services/fareCalculator";
import { softDeleteBooking } from "@/modules/bookings/services/softDeleteBooking";
import { maybeGenerateInvoiceOnComplete } from "@/modules/invoices/services/maybeGenerateOnComplete";

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
      if (customer.staffManaged) {
        return err({
          code: "FORBIDDEN",
          message: "This account cannot use the customer app.",
        });
      }
      if (input.customerId && input.customerId !== customer.id) {
        return err({
          code: "FORBIDDEN",
          message: "You can only create bookings for yourself.",
        });
      }
      scopedInput = {
        ...input,
        customerId: customer.id,
        quotedFare: null,
        tollAmount: null,
        parkingAmount: null,
      };
    }

    const result = await createBooking(scopedInput, { id: actor.profile.id });
    revalidatePath("/bookings");
    revalidatePath("/portal/bookings");
    // Return only the id — the full BookingDetail contains Prisma Decimal fields
    // which React cannot serialize across the server→client boundary.
    if (!result.ok) return result;
    return ok({ id: result.data.id });
  },
);

export const createDeskBookingAction = action(
  "bookings.create_desk",
  createDeskBookingSchema,
  async (input) => {
    const actor = await requirePermission(PERMISSIONS.BOOKING_CREATE);
    if (actor.profile.role === "CUSTOMER") {
      return err({
        code: "FORBIDDEN",
        message: "Use the customer booking form.",
      });
    }
    const result = await createDeskBooking(input, { id: actor.profile.id });
    revalidatePath("/bookings");
    revalidatePath("/customers");
    if (!result.ok) return result;
    return ok({ id: result.data.id });
  },
);

export const updatePendingBookingAction = action(
  "bookings.update_pending",
  updatePendingBookingSchema,
  async (input) => {
    const actor = await requirePermission(PERMISSIONS.BOOKING_CREATE);
    const result = await updatePendingBooking(input, { id: actor.profile.id }, {
      customerProfileId: actor.profile.role === "CUSTOMER" ? actor.profile.id : undefined,
    });
    if (!result.ok) return result;
    revalidatePath("/bookings");
    revalidatePath(`/bookings/${input.bookingId}`);
    revalidatePath("/portal/bookings");
    revalidatePath(`/portal/bookings/${input.bookingId}`);
    return ok({ id: result.data.id });
  },
);

export const estimateFareAction = action(
  "bookings.estimate_fare",
  estimateFareSchema,
  async (input) => {
    await requirePermission(PERMISSIONS.BOOKING_CREATE);
    const fare = await estimateFare({
      bookingTypeId: input.bookingTypeId,
      branchId: input.branchId,
      distanceKm: input.distanceKm ?? undefined,
    });
    if (!fare) return ok({ total: null as number | null });
    return ok({ total: fare.total });
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
    if (input.toStatus === BookingStatus.COMPLETED) {
      await maybeGenerateInvoiceOnComplete(input.bookingId, {
        id: actor.profile.id,
      });
      revalidatePath("/invoices");
    }
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
