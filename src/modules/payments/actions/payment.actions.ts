"use server";

import { revalidatePath } from "next/cache";
import { action } from "@/lib/actions";
import { requirePermission, requireRole } from "@/lib/auth/requireRole";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createPayment } from "@/modules/payments/services/payment.service";
import { createCustomerCheckout } from "@/modules/payments/services/customer-checkout.service";
import {
  createPaymentSchema,
  customerCheckoutSchema,
} from "@/modules/payments/validators/payment";
import { getCustomerByProfileId } from "@/modules/customers/queries/customer-by-phone";
import { err } from "@/lib/result";

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

export const createCustomerCheckoutAction = action(
  "payment.customer.checkout",
  customerCheckoutSchema,
  async ({ bookingId }) => {
    const actor = await requireRole(["CUSTOMER"]);
    const customer = await getCustomerByProfileId(actor.profile.id);
    if (!customer) {
      return err({ code: "NOT_FOUND", message: "Customer profile not found." });
    }
    const result = await createCustomerCheckout(bookingId, {
      id: actor.profile.id,
      customerId: customer.id,
    });
    revalidatePath(`/portal/bookings/${bookingId}`);
    return result;
  },
);
