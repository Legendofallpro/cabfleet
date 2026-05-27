"use server";

import { revalidatePath } from "next/cache";
import { action } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/requireRole";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createExpense } from "@/modules/expenses/services/expense.service";
import { createExpenseSchema } from "@/modules/expenses/validators/expense";

export const createExpenseAction = action(
  "expense.create",
  createExpenseSchema,
  async (input) => {
    const actor = await requirePermission(PERMISSIONS.EXPENSE_MANAGE);
    const result = await createExpense(input, { id: actor.profile.id });
    if (input.vehicleId) revalidatePath(`/vehicles/${input.vehicleId}`);
    revalidatePath("/reports");
    return result;
  },
);
