"use server";

import { revalidatePath } from "next/cache";
import { action } from "@/lib/actions";
import { requireRole } from "@/lib/auth/requireRole";
import {
  refundDecisionSchema,
  rejectRefundSchema,
  requestRefundSchema,
} from "@/modules/payments/validators/refund";
import {
  approveRefund,
  rejectRefund,
  requestRefund,
} from "@/modules/payments/services/refund.service";

/**
 * Refund actions (Phase 7 W3 §7.5 S12).
 *
 * Both approval paths (approve + reject) require a *different* admin from
 * the requester — enforced inside the service layer, not in DB. ADMIN +
 * SUPER_ADMIN are the allowed roles; STAFF cannot refund.
 */

export const requestRefundAction = action(
  "payments.refundRequest",
  requestRefundSchema,
  async (input) => {
    const actor = await requireRole(["ADMIN", "SUPER_ADMIN"]);
    const result = await requestRefund(input, { id: actor.profile.id });
    revalidatePath("/payments");
    revalidatePath("/payments/refunds");
    return result;
  },
);

export const approveRefundAction = action(
  "payments.refundApprove",
  refundDecisionSchema,
  async ({ refundId }) => {
    const actor = await requireRole(["ADMIN", "SUPER_ADMIN"]);
    const result = await approveRefund(refundId, { id: actor.profile.id });
    revalidatePath("/payments/refunds");
    return result;
  },
);

export const rejectRefundAction = action(
  "payments.refundReject",
  rejectRefundSchema,
  async (input) => {
    const actor = await requireRole(["ADMIN", "SUPER_ADMIN"]);
    const result = await rejectRefund(input, { id: actor.profile.id });
    revalidatePath("/payments/refunds");
    return result;
  },
);
