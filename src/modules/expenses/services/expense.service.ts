import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { writeAudit } from "@/lib/audit";
import { ok, type Result } from "@/lib/result";
import { logger } from "@/lib/logger";
import type { Expense } from "@prisma/client";
import type { ExpenseInput } from "@/modules/expenses/validators/expense";

type Actor = { id: string };

/**
 * Creates an expense record.
 * Either profileId or vehicleId (or both) should be supplied.
 */
export async function createExpense(
  input: ExpenseInput,
  actor: Actor,
): Promise<Result<Expense>> {
  if (input.vehicleId) {
    const vehicle = await db.vehicle.findFirst({
      where: { id: input.vehicleId, deletedAt: null },
      select: { id: true },
    });
    if (!vehicle) throw new AppError("NOT_FOUND", "Vehicle not found.");
  }

  if (input.profileId) {
    const profile = await db.profile.findUnique({
      where: { id: input.profileId },
      select: { id: true },
    });
    if (!profile) throw new AppError("NOT_FOUND", "Profile not found.");
  }

  const record = await db.$transaction(async (tx) => {
    const created = await tx.expense.create({
      data: {
        profileId: input.profileId ?? null,
        vehicleId: input.vehicleId ?? null,
        category: input.category,
        amount: input.amount,
        receiptUrl: input.receiptUrl || null,
        notes: input.notes ?? null,
        at: input.at ?? new Date(),
      },
    });

    await writeAudit(tx, {
      entity: "Expense",
      entityId: created.id,
      action: "CREATE",
      byProfileId: actor.id,
      diff: { after: { ...created, amount: Number(created.amount) } },
    });

    return created;
  });

  logger.info(
    { expenseId: record.id, category: input.category, by: actor.id },
    "expense.created",
  );

  return ok(record);
}
