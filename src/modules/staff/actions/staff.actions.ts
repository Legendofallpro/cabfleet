"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { action } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/requireRole";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  inviteStaffSchema,
  updateStaffSchema,
} from "@/modules/staff/validators/staff";
import {
  inviteStaff,
  softDeleteStaff,
  updateStaff,
} from "@/modules/staff/services/staff.service";

const idSchema = z.object({ id: z.string().min(1) });

export const inviteStaffAction = action(
  "staff.invite",
  inviteStaffSchema,
  async (input) => {
    const actor = await requirePermission(PERMISSIONS.STAFF_MANAGE);
    const result = await inviteStaff(input, { id: actor.profile.id });
    revalidatePath("/staff");
    return result;
  },
);

export const updateStaffAction = action(
  "staff.update",
  updateStaffSchema,
  async (input) => {
    const actor = await requirePermission(PERMISSIONS.STAFF_MANAGE);
    const result = await updateStaff(input, { id: actor.profile.id });
    revalidatePath("/staff");
    revalidatePath(`/staff/${input.id}`);
    return result;
  },
);

export const deleteStaffAction = action(
  "staff.delete",
  idSchema,
  async ({ id }) => {
    const actor = await requirePermission(PERMISSIONS.STAFF_MANAGE);
    const result = await softDeleteStaff(id, { id: actor.profile.id });
    revalidatePath("/staff");
    return result;
  },
);
