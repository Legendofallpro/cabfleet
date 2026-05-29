"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { action } from "@/lib/actions";
import { requireRole } from "@/lib/auth/requireRole";
import { eraseCustomer } from "@/modules/dsr/services/eraseCustomer";

/**
 * DSR actions (Phase 7 W2 §6.5 S14).
 *
 * SUPER_ADMIN-only at the action layer. Tenant ADMINs cannot trigger DSR
 * erasure — those requests go to the platform operator who owns the
 * ticketing flow and the audit trail. (If/when per-tenant DSR is required
 * the gate switches to `requireRole(["ADMIN","SUPER_ADMIN"])` and the
 * customer ownership is verified inside the service.)
 */
const eraseCustomerSchema = z.object({
  customerId: z.string().min(1),
  dsrRequestId: z
    .string()
    .min(1, "DSR request id is required for the audit trail."),
});

export const eraseCustomerAction = action(
  "dsr.eraseCustomer",
  eraseCustomerSchema,
  async (input) => {
    const actor = await requireRole(["SUPER_ADMIN"]);
    const result = await eraseCustomer(input, { id: actor.profile.id });
    revalidatePath("/customers");
    revalidatePath(`/customers/${input.customerId}`);
    return result;
  },
);
