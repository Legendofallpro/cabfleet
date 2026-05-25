"use server";

import { revalidatePath } from "next/cache";
import { action } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/requireRole";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ok } from "@/lib/result";
import {
  createDispatchRule,
  deleteDispatchRule,
} from "@/modules/dispatch/services/dispatch-rule.service";
import {
  createDispatchRuleSchema,
  deleteDispatchRuleSchema,
} from "@/modules/dispatch/validators/dispatch-rule";

export const createDispatchRuleAction = action(
  "dispatch.rule.create",
  createDispatchRuleSchema,
  async (input) => {
    const actor = await requirePermission(PERMISSIONS.DISPATCH_MANAGE);
    const result = await createDispatchRule(input, { id: actor.profile.id });
    revalidatePath("/settings/dispatch");
    if (!result.ok) return result;
    return ok({ id: result.data.id });
  },
);

export const deleteDispatchRuleAction = action(
  "dispatch.rule.delete",
  deleteDispatchRuleSchema,
  async ({ id }) => {
    const actor = await requirePermission(PERMISSIONS.DISPATCH_MANAGE);
    const result = await deleteDispatchRule(id, { id: actor.profile.id });
    revalidatePath("/settings/dispatch");
    return result;
  },
);
