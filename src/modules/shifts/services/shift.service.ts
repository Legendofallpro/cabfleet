import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { writeAudit } from "@/lib/audit";
import { ok, type Result } from "@/lib/result";
import { logger } from "@/lib/logger";
import type { Shift } from "@prisma/client";
import type { ShiftInput } from "@/modules/shifts/validators/shift";

type Actor = { id: string };

/**
 * Creates a shift for a branch, optionally assigned to a staff member.
 * Writes an AuditLog row inside the same transaction.
 */
export async function createShift(
  input: ShiftInput,
  actor: Actor,
): Promise<Result<Shift>> {
  const branch = await db.branch.findFirst({
    where: { id: input.branchId, deletedAt: null },
    select: { id: true },
  });
  if (!branch) throw new AppError("NOT_FOUND", "Branch not found.");

  if (input.staffId) {
    const staff = await db.staff.findFirst({
      where: { id: input.staffId, deletedAt: null },
      select: { id: true },
    });
    if (!staff) throw new AppError("NOT_FOUND", "Staff member not found.");
  }

  const shift = await db.$transaction(async (tx) => {
    const created = await tx.shift.create({
      data: {
        branchId: input.branchId,
        staffId: input.staffId ?? null,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        notes: input.notes ?? null,
      },
    });

    await writeAudit(tx, {
      entity: "Shift",
      entityId: created.id,
      action: "CREATE",
      byProfileId: actor.id,
      diff: { after: { ...created } },
    });

    return created;
  });

  logger.info(
    { shiftId: shift.id, branchId: input.branchId, staffId: input.staffId, by: actor.id },
    "shift.created",
  );

  return ok(shift);
}

/**
 * Deletes a shift record permanently.
 * Writes an AuditLog row inside the same transaction.
 */
export async function deleteShift(
  id: string,
  actor: Actor,
): Promise<Result<Shift>> {
  const existing = await db.shift.findFirst({ where: { id } });
  if (!existing) throw new AppError("NOT_FOUND", "Shift not found.");

  const shift = await db.$transaction(async (tx) => {
    const deleted = await tx.shift.delete({ where: { id } });

    await writeAudit(tx, {
      entity: "Shift",
      entityId: id,
      action: "CANCEL",
      byProfileId: actor.id,
      diff: { before: { ...existing } },
    });

    return deleted;
  });

  logger.info({ shiftId: id, by: actor.id }, "shift.deleted");

  return ok(shift);
}
