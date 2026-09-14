"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { action } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/requireRole";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ok } from "@/lib/result";
import { getOpenVehicleAssignment } from "@/modules/drivers/queries/driver";
import {
  assignVehicleToDriver,
  endVehicleAssignment,
} from "@/modules/drivers/services/vehicle-assignment.service";
import {
  assignVehicleSchema,
  endVehicleAssignmentSchema,
} from "@/modules/drivers/validators/vehicle-assignment";

export const getPairedVehicleAction = action(
  "driver.paired_vehicle",
  z.object({ driverId: z.string().min(1) }),
  async ({ driverId }) => {
    await requirePermission(PERMISSIONS.BOOKING_ASSIGN);
    const row = await getOpenVehicleAssignment(driverId);
    return ok({ vehicleId: row?.vehicle.id ?? null });
  },
);

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
