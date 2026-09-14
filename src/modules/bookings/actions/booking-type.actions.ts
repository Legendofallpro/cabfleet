"use server";

import { revalidatePath } from "next/cache";
import { action } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/requireRole";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ok } from "@/lib/result";
import {
  createBookingType,
  deleteBookingType,
} from "@/modules/bookings/services/booking-type.service";
import {
  createBookingTypeSchema,
  deleteBookingTypeSchema,
} from "@/modules/bookings/validators/booking-type";

export const createBookingTypeAction = action(
  "booking_type.create",
  createBookingTypeSchema,
  async (input) => {
    const actor = await requirePermission(PERMISSIONS.PRICING_MANAGE);
    const result = await createBookingType(input, { id: actor.profile.id });
    revalidatePath("/settings/booking-types");
    revalidatePath("/bookings/new");
    if (!result.ok) return result;
    return ok({ id: result.data.id });
  },
);

export const deleteBookingTypeAction = action(
  "booking_type.delete",
  deleteBookingTypeSchema,
  async ({ id }) => {
    const actor = await requirePermission(PERMISSIONS.PRICING_MANAGE);
    const result = await deleteBookingType(id, { id: actor.profile.id });
    revalidatePath("/settings/booking-types");
    return result;
  },
);
