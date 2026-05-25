"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { action } from "@/lib/actions";
import { requireRole } from "@/lib/auth/requireRole";
import { ok, err } from "@/lib/result";
import { db } from "@/lib/db";
import { getOrCreateCustomer } from "@/modules/customers/queries/customer";
import { cancelBooking } from "@/modules/bookings/services/booking.service";

// ──────────────────────────────────────────────────────────────────────────────
// Customer cancel own booking
// Ownership check: verifies the booking belongs to the signed-in customer
// before delegating to the shared cancelBooking service.
// ──────────────────────────────────────────────────────────────────────────────

const cancelOwnBookingSchema = z.object({
  bookingId: z.string().min(1),
  reason: z.string().max(300).optional(),
});

export const cancelOwnBookingAction = action(
  "bookings.customer.cancel",
  cancelOwnBookingSchema,
  async ({ bookingId, reason }) => {
    const actor = await requireRole(["CUSTOMER"]);

    const customer = await getOrCreateCustomer(actor.profile.id);
    const booking = await db.booking.findFirst({
      where: { id: bookingId, customerId: customer.id, deletedAt: null },
      select: { id: true },
    });
    if (!booking) {
      return err({ code: "NOT_FOUND", message: "Booking not found." });
    }

    const result = await cancelBooking({ bookingId, reason }, { id: actor.profile.id });
    revalidatePath("/portal/bookings");
    revalidatePath("/portal");
    if (!result.ok) return result;
    return ok({ id: result.data.id });
  },
);
