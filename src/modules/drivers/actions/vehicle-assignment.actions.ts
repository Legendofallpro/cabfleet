"use server";

import { revalidatePath } from "next/cache";
import { action } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/requireRole";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  assignVehicleToDriver,
  endVehicleAssignment,
} from "@/modules/drivers/services/vehicle-assignment.service";
import {
  assignVehicleSchema,
  endVehicleAssignmentSchema,
} from "@/modules/drivers/validators/vehicle-assignment";

export const assignVehicleAction = action(
  "driver.assign_vehicle",
  assignVehicleSchema,
  async (input) => {
    const actor = await requirePermission(PERMISSIONS.DRIVER_MANAGE);
    const result = await assignVehicleToDriver(input, { id: actor.profile.id });
    revalidatePath(`/drivers/${input.driverId}`);
    revalidatePath("/driver");
    return result;
  },
);

export const endVehicleAssignmentAction = action(
  "driver.end_vehicle_assignment",
  endVehicleAssignmentSchema,
  async ({ assignmentId }) => {
    const actor = await requirePermission(PERMISSIONS.DRIVER_MANAGE);
    const result = await endVehicleAssignment(assignmentId, { id: actor.profile.id });
    revalidatePath("/drivers");
    return result;
  },
);
