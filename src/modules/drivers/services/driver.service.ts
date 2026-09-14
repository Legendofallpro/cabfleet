import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { writeAudit } from "@/lib/audit";
import { ok, type Result } from "@/lib/result";
import { tombstoneUniqueValue } from "@/lib/soft-delete";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { runWithoutOrg } from "@/lib/org-context";
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

  const dupeLicense = await runWithoutOrg("driver.license_dup_check", () =>
    db.driver.findFirst({ where: { licenseNumber: input.licenseNumber } }),
  );
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
    logger.error({ err: invite.error }, "driver.invite.supabase_failed");
    throw new AppError("INTERNAL", "Failed to invite driver. Please try again.");
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
    const dupe = await runWithoutOrg("driver.license_dup_check", () =>
      db.driver.findFirst({ where: { licenseNumber: input.licenseNumber } }),
    );
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

/**
 * S22 — terminate a driver with forced sign-out.
 *
 * The combination is non-negotiable: a softDelete alone leaves any
 * existing access + refresh tokens live for their full TTL, which
 * means a fired driver can keep claiming/transitioning trips through
 * the REST v1 API until those tokens naturally expire. We:
 *
 *  1. Ban the Supabase Auth user (`ban_duration: '876000h'`) — this
 *     immediately invalidates all live refresh tokens and blocks
 *     re-authentication. Access tokens still validate until they
 *     expire (Supabase doesn't sign-out access tokens server-side),
 *     so the upstream remediation is short access-token TTLs +
 *     `requireApiAuth`-side checks on `Profile.role`/`Driver.status`.
 *  2. In a single Prisma transaction: set Driver.status = SUSPENDED,
 *     set deletedAt, tombstone the license number (so it can be
 *     re-issued to a future driver), and write a TERMINATE audit row.
 *
 * The ban happens BEFORE the DB write because the Supabase call is
 * the externally-visible operation; if it fails we surface the error
 * to the actor without having tombstoned the DB row.
 */
export async function terminateDriver(
  id: string,
  reason: string,
  actor: Actor,
): Promise<Result<true>> {
  const current = await db.driver.findFirst({
    where: { id, deletedAt: null },
    include: { profile: true },
  });
  if (!current) throw new AppError("NOT_FOUND", "Driver not found.");

  const supabase = getSupabaseAdminClient();
  // 100-year ban is the documented Supabase pattern for permanent
  // termination. Any string accepted by Go's time.ParseDuration works.
  const banResult = await supabase.auth.admin.updateUserById(current.profileId, {
    ban_duration: "876000h",
  });
  if (banResult.error) {
    logger.error(
      { err: banResult.error, driverId: id },
      "driver.terminate.ban_failed",
    );
    throw new AppError(
      "INTERNAL",
      "Failed to revoke driver sessions. Please try again.",
    );
  }

  const deletedLicenseNumber = tombstoneUniqueValue(
    current.licenseNumber,
    current.id,
  );

  await db.$transaction(async (tx) => {
    await tx.driver.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: "SUSPENDED",
        licenseNumber: deletedLicenseNumber,
      },
    });
    // AuditAction has no dedicated "TERMINATE" value, so we reuse DELETE
    // and tag the diff so reports can distinguish a routine soft-delete
    // from a forced sign-out termination.
    await writeAudit(tx, {
      entity: "Driver",
      entityId: id,
      action: "DELETE",
      byProfileId: actor.id,
      diff: {
        kind: "TERMINATE",
        before: {
          status: current.status,
          licenseNumber: current.licenseNumber,
        },
        after: {
          status: "SUSPENDED",
          licenseNumber: deletedLicenseNumber,
          banned: true,
        },
        reason,
      },
    });
  });

  logger.info(
    { driverId: id, profileId: current.profileId, actorId: actor.id },
    "driver.terminated",
  );

  return ok(true);
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
