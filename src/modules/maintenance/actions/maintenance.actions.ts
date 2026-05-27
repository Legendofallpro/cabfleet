"use server";

import { revalidatePath } from "next/cache";
import { action } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/requireRole";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createMaintenanceLog } from "@/modules/maintenance/services/maintenance.service";
import { createMaintenanceLogSchema } from "@/modules/maintenance/validators/maintenance";

export const createMaintenanceLogAction = action(
  "maintenance.create",
  createMaintenanceLogSchema,
  async (input) => {
    const actor = await requirePermission(PERMISSIONS.MAINTENANCE_MANAGE);
    const result = await createMaintenanceLog(input, { id: actor.profile.id });
    revalidatePath(`/vehicles/${input.vehicleId}`);
    return result;
  },
);
