import { randomBytes } from "node:crypto";

import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { writeAudit } from "@/lib/audit";
import { ok, type Result } from "@/lib/result";
import { logger } from "@/lib/logger";
import { toE164, resolvePhoneRegion, invalidPhoneMessage } from "@/lib/utils/phone";
import { getInstallSettings } from "@/modules/install/queries/install";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createPortalClaimToken,
  portalClaimUrl,
  verifyPortalClaimToken,
} from "@/lib/auth/portal-claim-proof";
import {
  isStaffManagedEmail,
  staffManagedEmailFromE164,
} from "@/modules/customers/staff-managed";
import type { FindOrCreateStaffCustomerInput } from "@/modules/customers/validators/customer";

export type CustomerRow = {
  id: string;
  profileId: string;
  loyaltyTier: string | null;
  totalBookings: number;
  totalSpend: number;
  staffManaged: boolean;
  createdAt: Date;
  profile: {
    fullName: string | null;
    email: string;
    phone: string | null;
  };
};

type Actor = { id: string };

const CUSTOMER_SELECT = {
  id: true,
  profileId: true,
  loyaltyTier: true,
  totalBookings: true,
  totalSpend: true,
  staffManaged: true,
  createdAt: true,
  profile: { select: { fullName: true, email: true, phone: true } },
} as const;

function toRow(row: {
  id: string;
  profileId: string;
  loyaltyTier: string | null;
  totalBookings: number;
  totalSpend: { toString(): string } | number;
  staffManaged: boolean;
  createdAt: Date;
  profile: { fullName: string | null; email: string; phone: string | null };
}): CustomerRow {
  return {
    ...row,
    totalSpend: Number(row.totalSpend),
  };
}

/**
 * Returns the Customer extension record for a Profile, or creates it lazily.
 */
export async function getOrCreateCustomer(profileId: string): Promise<CustomerRow> {
  const existing = await db.customer.findFirst({
    where: { profileId, deletedAt: null },
    select: CUSTOMER_SELECT,
  });

  if (existing) {
    return toRow(existing);
  }

  const created = await db.customer.create({
    data: { profileId, staffManaged: false },
    select: CUSTOMER_SELECT,
  });

  return toRow(created);
}

/**
 * Desk path: find a customer by mobile, or create a staff-managed
 * guest (synthetic email, no invite, no portal).
 */
export async function findOrCreateStaffCustomer(
  input: FindOrCreateStaffCustomerInput,
  actor: Actor,
): Promise<Result<CustomerRow>> {
  const settings = await getInstallSettings();
  const region = resolvePhoneRegion(settings?.phoneRegion);
  const parsed = toE164(input.phone, region);
  if (!parsed.ok) {
    throw new AppError("VALIDATION", `${invalidPhoneMessage(region)}.`, {
      fieldErrors: { phone: ["Invalid mobile number"] },
    });
  }

  const existingProfile = await db.profile.findFirst({
    where: { phone: parsed.e164, deletedAt: null },
    include: { customer: true },
  });

  if (existingProfile?.customer && existingProfile.customer.deletedAt === null) {
    return ok(toRow({
      ...existingProfile.customer,
      profile: {
        fullName: existingProfile.fullName,
        email: existingProfile.email,
        phone: existingProfile.phone,
      },
    }));
  }

  if (existingProfile && !existingProfile.customer) {
    throw new AppError("CONFLICT", "This number is already registered to another user.", {
      fieldErrors: { phone: ["Already in use"] },
    });
  }

  const email = staffManagedEmailFromE164(parsed.e164);
  const supabase = getSupabaseAdminClient();
  const created = await supabase.auth.admin.createUser({
    email,
    password: randomBytes(24).toString("hex"),
    email_confirm: true,
    user_metadata: {
      full_name: input.fullName,
      phone: parsed.e164,
      role: "CUSTOMER",
    },
  });

  if (created.error || !created.data.user) {
    logger.error({ err: created.error }, "customer.staff_managed.supabase_failed");
    throw new AppError("INTERNAL", "Failed to create customer. Please try again.");
  }

  const userId = created.data.user.id;

  const row = await db.$transaction(async (tx) => {
    await tx.profile.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email,
        fullName: input.fullName,
        phone: parsed.e164,
        role: "CUSTOMER",
      },
      update: {
        fullName: input.fullName,
        phone: parsed.e164,
        role: "CUSTOMER",
      },
    });

    const customer = await tx.customer.create({
      data: {
        profileId: userId,
        staffManaged: true,
      },
      select: CUSTOMER_SELECT,
    });

    await writeAudit(tx, {
      entity: "Customer",
      entityId: customer.id,
      action: "CREATE",
      byProfileId: actor.id,
      diff: { after: { phone: parsed.e164, staffManaged: true } },
    });

    return customer;
  });

  logger.info({ customerId: row.id, by: actor.id }, "customer.staff_managed.create");
  return ok(toRow(row));
}

/**
 * Public signup helper. Never links a staff-managed guest — that requires a
 * staff-issued HMAC claim token. Existing phones/emails get a generic conflict.
 */
export async function prepareCustomerSignup(input: {
  email: string;
  password: string;
  phone: string;
  fullName: string;
}): Promise<Result<{ mode: "new" }>> {
  const email = input.email.trim().toLowerCase();
  if (isStaffManagedEmail(email) || email.endsWith(".invalid")) {
    throw new AppError("VALIDATION", "Use a real email address.", {
      fieldErrors: { email: ["Use a real email address"] },
    });
  }

  const settings = await getInstallSettings();
  const region = resolvePhoneRegion(settings?.phoneRegion);
  const parsed = toE164(input.phone, region);
  if (!parsed.ok) {
    throw new AppError("VALIDATION", `${invalidPhoneMessage(region)}.`, {
      fieldErrors: { phone: ["Invalid mobile number"] },
    });
  }

  const emailTaken = await db.profile.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, deletedAt: null },
  });
  if (emailTaken) {
    throw new AppError("CONFLICT", "This account cannot be created with these details.", {
      fieldErrors: { email: ["Already registered"] },
    });
  }

  const existing = await db.profile.findFirst({
    where: { phone: parsed.e164, deletedAt: null },
    include: { customer: true },
  });

  if (!existing) {
    return ok({ mode: "new" });
  }

  throw new AppError("CONFLICT", "This account cannot be created with these details.", {
    fieldErrors: { phone: ["Already registered"] },
  });
}

export async function inviteCustomerToPortal(
  customerId: string,
  actor: { id: string },
): Promise<Result<{ url: string; phone: string | null }>> {
  const customer = await db.customer.findFirst({
    where: { id: customerId, deletedAt: null },
    include: { profile: true },
  });
  if (!customer) throw new AppError("NOT_FOUND", "Customer not found.");
  if (!customer.staffManaged) {
    throw new AppError("CONFLICT", "This customer already has a portal account.");
  }

  const token = createPortalClaimToken(customer.id);
  const url = portalClaimUrl(token);
  logger.info(
    { customerId: customer.id, by: actor.id },
    "customer.portal_claim.invited",
  );
  return ok({ url, phone: customer.profile.phone });
}

export async function claimStaffManagedCustomer(input: {
  token: string;
  email: string;
  password: string;
  fullName: string;
}): Promise<Result<{ mode: "claimed" }>> {
  const verified = verifyPortalClaimToken(input.token);
  if (!verified) {
    throw new AppError("FORBIDDEN", "This invite link is invalid or has expired.");
  }

  const email = input.email.trim().toLowerCase();
  if (isStaffManagedEmail(email) || email.endsWith(".invalid")) {
    throw new AppError("VALIDATION", "Use a real email address.", {
      fieldErrors: { email: ["Use a real email address"] },
    });
  }

  const customer = await db.customer.findFirst({
    where: { id: verified.customerId, deletedAt: null },
    include: { profile: true },
  });
  if (!customer?.staffManaged) {
    throw new AppError("CONFLICT", "This invite has already been used.");
  }

  const emailTaken = await db.profile.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
      deletedAt: null,
      NOT: { id: customer.profileId },
    },
  });
  if (emailTaken) {
    throw new AppError("CONFLICT", "This email is already registered.", {
      fieldErrors: { email: ["Already registered"] },
    });
  }

  const supabase = getSupabaseAdminClient();
  const updated = await supabase.auth.admin.updateUserById(customer.profileId, {
    email,
    password: input.password,
    user_metadata: {
      full_name: input.fullName,
      phone: customer.profile.phone,
    },
  });
  if (updated.error) {
    logger.error({ err: updated.error }, "customer.portal_claim.supabase_failed");
    throw new AppError("CONFLICT", "Could not open this portal account.");
  }

  await db.$transaction(async (tx) => {
    await tx.profile.update({
      where: { id: customer.profileId },
      data: { email, fullName: input.fullName },
    });
    await tx.customer.update({
      where: { id: customer.id },
      data: { staffManaged: false },
    });
    await writeAudit(tx, {
      entity: "Customer",
      entityId: customer.id,
      action: "UPDATE",
      byProfileId: customer.profileId,
      diff: { after: { staffManaged: false, email } },
    });
  });

  logger.info({ customerId: customer.id }, "customer.portal_claim.completed");
  return ok({ mode: "claimed" });
}

export { isStaffManagedEmail };
