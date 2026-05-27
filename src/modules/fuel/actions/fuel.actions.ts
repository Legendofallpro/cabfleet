"use server";

import { revalidatePath } from "next/cache";
import { action } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/requireRole";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createFuelLog } from "@/modules/fuel/services/fuel.service";
import { createFuelLogSchema } from "@/modules/fuel/validators/fuel";

export const createFuelLogAction = action(
  "fuel.create",
  createFuelLogSchema,
  async (input) => {
    const actor = await requirePermission(PERMISSIONS.FUEL_MANAGE);
    const result = await createFuelLog(input, { id: actor.profile.id });
    revalidatePath(`/vehicles/${input.vehicleId}`);
    return result;
  },
);
