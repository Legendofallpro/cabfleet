"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { action } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/requireRole";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  inviteDriverSchema,
  updateDriverSchema,
} from "@/modules/drivers/validators/driver";
import {
  inviteDriver,
  softDeleteDriver,
  updateDriver,
} from "@/modules/drivers/services/driver.service";

const idSchema = z.object({ id: z.string().min(1) });

export const inviteDriverAction = action(
  "drivers.invite",
  inviteDriverSchema,
  async (input) => {
    const actor = await requirePermission(PERMISSIONS.DRIVER_MANAGE);
    const result = await inviteDriver(input, { id: actor.profile.id });
    revalidatePath("/drivers");
    return result;
  },
);

export const updateDriverAction = action(
  "drivers.update",
  updateDriverSchema,
  async (input) => {
    const actor = await requirePermission(PERMISSIONS.DRIVER_MANAGE);
    const result = await updateDriver(input, { id: actor.profile.id });
    revalidatePath("/drivers");
    revalidatePath(`/drivers/${input.id}`);
    return result;
  },
);

export const deleteDriverAction = action(
  "drivers.delete",
  idSchema,
  async ({ id }) => {
    const actor = await requirePermission(PERMISSIONS.DRIVER_MANAGE);
    const result = await softDeleteDriver(id, { id: actor.profile.id });
    revalidatePath("/drivers");
    return result;
  },
);
