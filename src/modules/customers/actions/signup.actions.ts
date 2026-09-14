"use server";

import { action } from "@/lib/actions";
import {
  claimStaffManagedCustomer,
  prepareCustomerSignup,
} from "@/modules/customers/services/customer.service";
import {
  claimStaffManagedCustomerSchema,
  prepareCustomerSignupSchema,
} from "@/modules/customers/validators/customer";

/** Public — no requireRole. Used from /signup before Supabase auth.signUp. */
export const prepareCustomerSignupAction = action(
  "customer.signup.prepare",
  prepareCustomerSignupSchema,
  async (input) => prepareCustomerSignup(input),
);

/** Public — HMAC token is the capability. */
export const claimStaffManagedCustomerAction = action(
  "customer.portal.claim",
  claimStaffManagedCustomerSchema,
  async (input) => claimStaffManagedCustomer(input),
);
