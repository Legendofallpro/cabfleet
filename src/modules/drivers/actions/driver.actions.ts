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
  terminateDriver,
  updateDriver,
} from "@/modules/drivers/services/driver.service";

const idSchema = z.object({ id: z.string().min(1) });

const terminateSchema = z.object({
  id: z.string().min(1),
  // Required free-text rationale for the audit trail — termination is a
  // destructive operation, the "why" is part of the record.
  reason: z.string().trim().min(3, "Reason is required").max(500),
});

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

/**
 * S22 — terminate a driver with forced Supabase sign-out. Distinct from
 * `deleteDriverAction` so the UI can present it with extra friction
 * (confirmation modal, mandatory reason) and so the audit trail
 * differentiates between an HR-driven termination and a benign cleanup.
 */
export const terminateDriverAction = action(
  "drivers.terminate",
  terminateSchema,
  async ({ id, reason }) => {
    const actor = await requirePermission(PERMISSIONS.DRIVER_MANAGE);
    const result = await terminateDriver(id, reason, { id: actor.profile.id });
    revalidatePath("/drivers");
    revalidatePath(`/drivers/${id}`);
    return result;
  },
);
