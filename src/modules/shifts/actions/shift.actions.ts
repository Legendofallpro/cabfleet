"use server";

import { revalidatePath } from "next/cache";
import { action } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/requireRole";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createShift, deleteShift } from "@/modules/shifts/services/shift.service";
import { createShiftSchema, deleteShiftSchema } from "@/modules/shifts/validators/shift";

export const createShiftAction = action(
  "shift.create",
  createShiftSchema,
  async (input) => {
    const actor = await requirePermission(PERMISSIONS.SHIFT_MANAGE);
    const result = await createShift(input, { id: actor.profile.id });
    revalidatePath("/shifts");
    return result;
  },
);

export const deleteShiftAction = action(
  "shift.delete",
  deleteShiftSchema,
  async (input) => {
    const actor = await requirePermission(PERMISSIONS.SHIFT_MANAGE);
    const result = await deleteShift(input.id, { id: actor.profile.id });
    revalidatePath("/shifts");
    return result;
  },
);
