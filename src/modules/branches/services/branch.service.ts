import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { writeAudit } from "@/lib/audit";
import { tombstoneUniqueValue } from "@/lib/soft-delete";
import { ok, type Result } from "@/lib/result";
import type { Branch } from "@prisma/client";
import type { BranchInput } from "@/modules/branches/validators/branch";

type Actor = { id: string };

export async function createBranch(
  input: BranchInput,
  actor: Actor,
): Promise<Result<Branch>> {
  const existing = await db.branch.findUnique({ where: { code: input.code } });
  if (existing) {
    throw new AppError("CONFLICT", `Branch code "${input.code}" is already in use.`, {
      fieldErrors: { code: ["Already in use"] },
    });
  }

  const branch = await db.$transaction(async (tx) => {
    const created = await tx.branch.create({
      data: {
        ...input,
        email: input.email || null,
      },
    });
    await writeAudit(tx, {
      entity: "Branch",
      entityId: created.id,
      action: "CREATE",
      byProfileId: actor.id,
      diff: { after: created },
    });
    return created;
  });

  return ok(branch);
}

export async function updateBranch(
  id: string,
  input: BranchInput,
  actor: Actor,
): Promise<Result<Branch>> {
  const current = await db.branch.findFirst({ where: { id, deletedAt: null } });
  if (!current) throw new AppError("NOT_FOUND", "Branch not found.");

  if (input.code !== current.code) {
    const dupe = await db.branch.findUnique({ where: { code: input.code } });
    if (dupe) {
      throw new AppError("CONFLICT", `Branch code "${input.code}" is already in use.`, {
        fieldErrors: { code: ["Already in use"] },
      });
    }
  }

  const branch = await db.$transaction(async (tx) => {
    const updated = await tx.branch.update({
      where: { id },
      data: { ...input, email: input.email || null },
    });
    await writeAudit(tx, {
      entity: "Branch",
      entityId: updated.id,
      action: "UPDATE",
      byProfileId: actor.id,
      diff: { before: current, after: updated },
    });
    return updated;
  });

  return ok(branch);
}

export async function softDeleteBranch(id: string, actor: Actor): Promise<Result<true>> {
  const current = await db.branch.findFirst({ where: { id, deletedAt: null } });
  if (!current) throw new AppError("NOT_FOUND", "Branch not found.");
  const deletedCode = tombstoneUniqueValue(current.code, current.id);

  await db.$transaction(async (tx) => {
    await tx.branch.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        active: false,
        code: deletedCode,
      },
    });
    await writeAudit(tx, {
      entity: "Branch",
      entityId: id,
      action: "DELETE",
      byProfileId: actor.id,
      diff: {
        before: { code: current.code },
        after: { code: deletedCode },
      },
    });
  });

  return ok(true);
}
