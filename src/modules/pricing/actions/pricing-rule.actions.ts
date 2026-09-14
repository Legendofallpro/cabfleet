"use server";

import { revalidatePath } from "next/cache";
import { action } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/requireRole";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ok } from "@/lib/result";
import {
  createPricingRule,
  deletePricingRule,
} from "@/modules/pricing/services/pricing-rule.service";
import {
  createPricingRuleSchema,
  deletePricingRuleSchema,
} from "@/modules/pricing/validators/pricing-rule";

export const createPricingRuleAction = action(
  "pricing.rule.create",
  createPricingRuleSchema,
  async (input) => {
    const actor = await requirePermission(PERMISSIONS.PRICING_MANAGE);
    const result = await createPricingRule(input, { id: actor.profile.id });
    revalidatePath("/settings/pricing");
    if (!result.ok) return result;
    return ok({ id: result.data.id });
  },
);

export const deletePricingRuleAction = action(
  "pricing.rule.delete",
  deletePricingRuleSchema,
  async ({ id }) => {
    const actor = await requirePermission(PERMISSIONS.PRICING_MANAGE);
    const result = await deletePricingRule(id, { id: actor.profile.id });
    revalidatePath("/settings/pricing");
    return result;
  },
);
