import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { writeAudit } from "@/lib/audit";
import { ok, type Result } from "@/lib/result";
import { tombstoneUniqueValue } from "@/lib/soft-delete";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { Driver } from "@prisma/client";
import type {
  InviteDriverInput,
  UpdateDriverInput,
} from "@/modules/drivers/validators/driver";

type Actor = { id: string };

async function assertBranch(branchId: string) {
  const branch = await db.branch.findFirst({ where: { id: branchId, deletedAt: null } });
  if (!branch) {
    throw new AppError("VALIDATION", "Branch is invalid", {
      fieldErrors: { branchId: ["Branch not found or inactive"] },
    });
  }
}

/**
 * Onboards a new driver:
 *  1. Creates a Supabase Auth user (sends invite email)
 *  2. Waits for the trigger to insert Profile, then updates role + branch
 *  3. Creates the Driver row
 *  4. Writes audit
 *
 * The Supabase trigger (prisma/sql/01_profile_sync.sql) inserts a CUSTOMER Profile
 * by default. We override role to DRIVER here.
 */
export async function inviteDriver(
  input: InviteDriverInput,
  actor: Actor,
): Promise<Result<Driver>> {
  await assertBranch(input.branchId);

  const dupeLicense = await db.driver.findUnique({
    where: { licenseNumber: input.licenseNumber },
  });
  if (dupeLicense) {
    throw new AppError("CONFLICT", "License number already registered.", {
      fieldErrors: { licenseNumber: ["Already in use"] },
    });
  }

  const supabase = getSupabaseAdminClient();
  const inviteRedirectTo = new URL("/auth/callback?mode=invite", env.NEXT_PUBLIC_APP_URL).toString();
  const invite = await supabase.auth.admin.inviteUserByEmail(input.email, {
    redirectTo: inviteRedirectTo,
    data: {
      full_name: input.fullName,
      role: "DRIVER",
      phone: input.phone,
    },
  });

  if (invite.error || !invite.data.user) {
    logger.error({ err: invite.error }, "Supabase invite failed");
    throw new AppError("INTERNAL", invite.error?.message ?? "Failed to invite driver.");
  }

  const userId = invite.data.user.id;

  const driver = await db.$transaction(async (tx) => {
    // Upsert the profile in case the trigger has not fired yet (it fires
    // asynchronously). On conflict we override role + branch + name + phone.
    await tx.profile.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email: input.email,
        fullName: input.fullName,
        phone: input.phone,
        role: "DRIVER",
        branchId: input.branchId,
      },
      update: {
        fullName: input.fullName,
        phone: input.phone,
        role: "DRIVER",
        branchId: input.branchId,
      },
    });

    const created = await tx.driver.create({
      data: {
        profileId: userId,
        licenseNumber: input.licenseNumber,
        licenseExpiry: input.licenseExpiry,
        status: input.status,
        verification: input.verification,
        notes: input.notes ?? undefined,
      },
    });

    await writeAudit(tx, {
      entity: "Driver",
      entityId: created.id,
      action: "CREATE",
      byProfileId: actor.id,
      diff: { after: created, profileId: userId },
    });

    return created;
  });

  return ok(driver);
}

export async function updateDriver(
  input: UpdateDriverInput,
  actor: Actor,
): Promise<Result<Driver>> {
  const current = await db.driver.findFirst({
    where: { id: input.id, deletedAt: null },
    include: { profile: true },
  });
  if (!current) throw new AppError("NOT_FOUND", "Driver not found.");

  if (input.branchId !== current.profile.branchId) await assertBranch(input.branchId);

  if (input.licenseNumber !== current.licenseNumber) {
    const dupe = await db.driver.findUnique({
      where: { licenseNumber: input.licenseNumber },
    });
    if (dupe) {
      throw new AppError("CONFLICT", "License number already registered.", {
        fieldErrors: { licenseNumber: ["Already in use"] },
      });
    }
  }

  const driver = await db.$transaction(async (tx) => {
    await tx.profile.update({
      where: { id: current.profileId },
      data: {
        fullName: input.fullName,
        phone: input.phone,
        branchId: input.branchId,
      },
    });

    const updated = await tx.driver.update({
      where: { id: input.id },
      data: {
        licenseNumber: input.licenseNumber,
        licenseExpiry: input.licenseExpiry,
        status: input.status,
        verification: input.verification,
        notes: input.notes ?? undefined,
      },
    });

    const action = current.status !== updated.status ? "STATUS_CHANGE" : "UPDATE";
    await writeAudit(tx, {
      entity: "Driver",
      entityId: updated.id,
      action,
      byProfileId: actor.id,
      diff: { before: current, after: updated },
    });

    return updated;
  });

  return ok(driver);
}

export async function softDeleteDriver(id: string, actor: Actor): Promise<Result<true>> {
  const current = await db.driver.findFirst({ where: { id, deletedAt: null } });
  if (!current) throw new AppError("NOT_FOUND", "Driver not found.");
  const deletedLicenseNumber = tombstoneUniqueValue(current.licenseNumber, current.id);

  await db.$transaction(async (tx) => {
    await tx.driver.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: "INACTIVE",
        licenseNumber: deletedLicenseNumber,
      },
    });
    await writeAudit(tx, {
      entity: "Driver",
      entityId: id,
      action: "DELETE",
      byProfileId: actor.id,
      diff: {
        before: { licenseNumber: current.licenseNumber },
        after: { licenseNumber: deletedLicenseNumber },
      },
    });
  });

  return ok(true);
}
