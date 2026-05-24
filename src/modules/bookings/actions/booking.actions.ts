"use server";

import { revalidatePath } from "next/cache";
import { BookingStatus } from "@prisma/client";
import { z } from "zod";

import { action } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/requireRole";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  createBookingSchema,
  assignDriverSchema,
  cancelBookingSchema,
  transitionSchema,
} from "@/modules/bookings/validators/booking";
import {
  createBooking,
  assignDriverToBooking,
  cancelBooking,
  transitionByStaff,
} from "@/modules/bookings/services/booking.service";

// ──────────────────────────────────────────────────────────────────────────────
// Create
// ──────────────────────────────────────────────────────────────────────────────

export const createBookingAction = action(
  "bookings.create",
  createBookingSchema,
  async (input) => {
    const actor = await requirePermission(PERMISSIONS.BOOKING_CREATE);
    const result = await createBooking(input, { id: actor.profile.id });
    revalidatePath("/bookings");
    return result;
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
    return result;
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
    return result;
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// Generic staff transition (en-route, in-progress, completed, failed, no-show)
// ──────────────────────────────────────────────────────────────────────────────

const staffTransitionStatuses = [
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
    return result;
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// Soft delete
// ──────────────────────────────────────────────────────────────────────────────

const idSchema = z.object({ bookingId: z.string().min(1) });

export const softDeleteBookingAction = action(
  "bookings.delete",
  idSchema,
  async ({ bookingId }) => {
    const actor = await requirePermission(PERMISSIONS.BOOKING_OVERRIDE);
    const current = await import("@/lib/db").then(({ db }) =>
      db.booking.findFirst({ where: { id: bookingId, deletedAt: null } }),
    );
    if (!current) {
      return { ok: false as const, error: { code: "NOT_FOUND", message: "Booking not found." } };
    }
    const { db } = await import("@/lib/db");
    const { writeAudit } = await import("@/lib/audit");
    await db.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: { deletedAt: new Date() },
      });
      await writeAudit(tx, {
        entity: "Booking",
        entityId: bookingId,
        action: "DELETE",
        byProfileId: actor.profile.id,
      });
    });
    revalidatePath("/bookings");
    return { ok: true as const, data: true };
  },
);
