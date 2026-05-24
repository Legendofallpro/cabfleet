"use server";

import { revalidatePath } from "next/cache";
import { action } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/requireRole";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  createBranchSchema,
  updateBranchSchema,
} from "@/modules/branches/validators/branch";
import { z } from "zod";
import {
  createBranch,
  softDeleteBranch,
  updateBranch,
} from "@/modules/branches/services/branch.service";

const idSchema = z.object({ id: z.string().min(1) });

export const createBranchAction = action(
  "branches.create",
  createBranchSchema,
  async (input) => {
    const actor = await requirePermission(PERMISSIONS.BRANCH_MANAGE);
    const result = await createBranch(input, { id: actor.profile.id });
    revalidatePath("/settings/branches");
    return result;
  },
);

export const updateBranchAction = action(
  "branches.update",
  updateBranchSchema,
  async ({ id, ...input }) => {
    const actor = await requirePermission(PERMISSIONS.BRANCH_MANAGE);
    const result = await updateBranch(id, input, { id: actor.profile.id });
    revalidatePath("/settings/branches");
    revalidatePath(`/settings/branches/${id}`);
    return result;
  },
);

export const deleteBranchAction = action(
  "branches.delete",
  idSchema,
  async ({ id }) => {
    const actor = await requirePermission(PERMISSIONS.BRANCH_MANAGE);
    const result = await softDeleteBranch(id, { id: actor.profile.id });
    revalidatePath("/settings/branches");
    return result;
  },
);
