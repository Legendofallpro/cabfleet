import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { writeAudit } from "@/lib/audit";
import { ok, type Result } from "@/lib/result";
import { tombstoneUniqueValue } from "@/lib/soft-delete";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { Staff } from "@prisma/client";
import type {
  InviteStaffInput,
  UpdateStaffInput,
} from "@/modules/staff/validators/staff";

type Actor = { id: string };

async function assertBranch(branchId: string) {
  const branch = await db.branch.findFirst({ where: { id: branchId, deletedAt: null } });
  if (!branch) {
    throw new AppError("VALIDATION", "Branch is invalid", {
      fieldErrors: { branchId: ["Branch not found or inactive"] },
    });
  }
}

export async function inviteStaff(
  input: InviteStaffInput,
  actor: Actor,
): Promise<Result<Staff>> {
  await assertBranch(input.branchId);

  const dupe = await db.staff.findUnique({ where: { employeeId: input.employeeId } });
  if (dupe) {
    throw new AppError("CONFLICT", "Employee ID already in use.", {
      fieldErrors: { employeeId: ["Already in use"] },
    });
  }

  const supabase = getSupabaseAdminClient();
  const inviteRedirectTo = new URL("/auth/callback?mode=invite", env.NEXT_PUBLIC_APP_URL).toString();
  const invite = await supabase.auth.admin.inviteUserByEmail(input.email, {
    redirectTo: inviteRedirectTo,
    data: {
      full_name: input.fullName,
      role: input.role,
      phone: input.phone ?? undefined,
    },
  });
  if (invite.error || !invite.data.user) {
    logger.error({ err: invite.error }, "Supabase invite failed (staff)");
    throw new AppError("INTERNAL", invite.error?.message ?? "Failed to invite staff.");
  }

  const userId = invite.data.user.id;

  const staff = await db.$transaction(async (tx) => {
    await tx.profile.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email: input.email,
        fullName: input.fullName,
        phone: input.phone ?? undefined,
        role: input.role,
        branchId: input.branchId,
      },
      update: {
        fullName: input.fullName,
        phone: input.phone ?? undefined,
        role: input.role,
        branchId: input.branchId,
      },
    });

    const created = await tx.staff.create({
      data: {
        profileId: userId,
        employeeId: input.employeeId,
        designation: input.designation,
        status: input.status,
        notes: input.notes ?? undefined,
      },
    });

    await writeAudit(tx, {
      entity: "Staff",
      entityId: created.id,
      action: "CREATE",
      byProfileId: actor.id,
      diff: { after: created, profileId: userId },
    });

    return created;
  });

  return ok(staff);
}

export async function updateStaff(
  input: UpdateStaffInput,
  actor: Actor,
): Promise<Result<Staff>> {
  const current = await db.staff.findFirst({
    where: { id: input.id, deletedAt: null },
    include: { profile: true },
  });
  if (!current) throw new AppError("NOT_FOUND", "Staff not found.");

  if (input.branchId !== current.profile.branchId) await assertBranch(input.branchId);

  if (input.employeeId !== current.employeeId) {
    const dupe = await db.staff.findUnique({ where: { employeeId: input.employeeId } });
    if (dupe) {
      throw new AppError("CONFLICT", "Employee ID already in use.", {
        fieldErrors: { employeeId: ["Already in use"] },
      });
    }
  }

  const staff = await db.$transaction(async (tx) => {
    await tx.profile.update({
      where: { id: current.profileId },
      data: {
        fullName: input.fullName,
        phone: input.phone ?? undefined,
        role: input.role,
        branchId: input.branchId,
      },
    });

    const updated = await tx.staff.update({
      where: { id: input.id },
      data: {
        employeeId: input.employeeId,
        designation: input.designation,
        status: input.status,
        notes: input.notes ?? undefined,
      },
    });

    const action = current.status !== updated.status ? "STATUS_CHANGE" : "UPDATE";
    await writeAudit(tx, {
      entity: "Staff",
      entityId: updated.id,
      action,
      byProfileId: actor.id,
      diff: { before: current, after: updated },
    });

    return updated;
  });

  return ok(staff);
}

export async function softDeleteStaff(id: string, actor: Actor): Promise<Result<true>> {
  const current = await db.staff.findFirst({ where: { id, deletedAt: null } });
  if (!current) throw new AppError("NOT_FOUND", "Staff not found.");
  const deletedEmployeeId = tombstoneUniqueValue(current.employeeId, current.id);

  await db.$transaction(async (tx) => {
    await tx.staff.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: "INACTIVE",
        employeeId: deletedEmployeeId,
      },
    });
    await writeAudit(tx, {
      entity: "Staff",
      entityId: id,
      action: "DELETE",
      byProfileId: actor.id,
      diff: {
        before: { employeeId: current.employeeId },
        after: { employeeId: deletedEmployeeId },
      },
    });
  });

  return ok(true);
}
