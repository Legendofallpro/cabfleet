"use server";

import { revalidatePath } from "next/cache";
import { action } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/requireRole";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ok } from "@/lib/result";
import { findOrCreateStaffCustomer, inviteCustomerToPortal } from "@/modules/customers/services/customer.service";
import { findCustomerByPhone } from "@/modules/customers/queries/customer-by-phone";
import {
  findOrCreateStaffCustomerSchema,
  lookupCustomerByPhoneSchema,
  inviteCustomerToPortalSchema,
} from "@/modules/customers/validators/customer";

export const lookupCustomerByPhoneAction = action(
  "customer.lookup_phone",
  lookupCustomerByPhoneSchema,
  async (input) => {
    await requirePermission(PERMISSIONS.CUSTOMER_VIEW);
    const hit = await findCustomerByPhone(input.phone);
    return ok(hit);
  },
);

export const findOrCreateStaffCustomerAction = action(
  "customer.staff_managed.create",
  findOrCreateStaffCustomerSchema,
  async (input) => {
    const actor = await requirePermission(PERMISSIONS.CUSTOMER_MANAGE);
    const result = await findOrCreateStaffCustomer(input, { id: actor.profile.id });
    revalidatePath("/customers");
    revalidatePath("/bookings/new");
    if (!result.ok) return result;
    return ok({
      id: result.data.id,
      staffManaged: result.data.staffManaged,
      profile: result.data.profile,
    });
  },
);

export const inviteCustomerToPortalAction = action(
  "customer.portal.invite",
  inviteCustomerToPortalSchema,
  async (input) => {
    const actor = await requirePermission(PERMISSIONS.CUSTOMER_MANAGE);
    const result = await inviteCustomerToPortal(input.customerId, { id: actor.profile.id });
    return result;
  },
);
