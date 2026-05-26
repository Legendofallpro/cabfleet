"use server";

import { revalidatePath } from "next/cache";
import { action } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/requireRole";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createPayment } from "@/modules/payments/services/payment.service";
import { createPaymentSchema } from "@/modules/payments/validators/payment";

export const createPaymentAction = action(
  "payment.create",
  createPaymentSchema,
  async (input) => {
    const actor = await requirePermission(PERMISSIONS.PAYMENT_MANAGE);
    const result = await createPayment(input, { id: actor.profile.id });
    revalidatePath("/payments");
    revalidatePath(`/bookings/${input.bookingId}`);
    return result;
  },
);
