"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { action } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/requireRole";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  createVehicleSchema,
  updateVehicleSchema,
} from "@/modules/vehicles/validators/vehicle";
import {
  createVehicle,
  softDeleteVehicle,
  updateVehicle,
} from "@/modules/vehicles/services/vehicle.service";

const idSchema = z.object({ id: z.string().min(1) });

export const createVehicleAction = action(
  "vehicles.create",
  createVehicleSchema,
  async (input) => {
    const actor = await requirePermission(PERMISSIONS.VEHICLE_MANAGE);
    const result = await createVehicle(input, { id: actor.profile.id });
    revalidatePath("/vehicles");
    return result;
  },
);

export const updateVehicleAction = action(
  "vehicles.update",
  updateVehicleSchema,
  async ({ id, ...input }) => {
    const actor = await requirePermission(PERMISSIONS.VEHICLE_MANAGE);
    const result = await updateVehicle(id, input, { id: actor.profile.id });
    revalidatePath("/vehicles");
    revalidatePath(`/vehicles/${id}`);
    return result;
  },
);

export const deleteVehicleAction = action(
  "vehicles.delete",
  idSchema,
  async ({ id }) => {
    const actor = await requirePermission(PERMISSIONS.VEHICLE_MANAGE);
    const result = await softDeleteVehicle(id, { id: actor.profile.id });
    revalidatePath("/vehicles");
    return result;
  },
);
