import { db } from "@/lib/db";
import { ok, type Result } from "@/lib/result";
import { writeAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import type { CreatePricingRuleInput } from "@/modules/pricing/validators/pricing-rule";
import type { PricingRule } from "@prisma/client";

type Actor = { id: string };

export async function createPricingRule(
  input: CreatePricingRuleInput,
  actor: Actor,
): Promise<Result<PricingRule>> {
  const rule = await db.$transaction(async (tx) => {
    const created = await tx.pricingRule.create({
      data: {
        bookingTypeId: input.bookingTypeId,
        branchId: input.branchId || null,
        baseFare: input.baseFare,
        perKm: input.perKm,
        perMin: input.perMin,
        validFrom: input.validFrom ?? new Date(),
        validTo: input.validTo ?? null,
      },
    });
    await writeAudit(tx, {
      entity: "PricingRule",
      entityId: created.id,
      action: "CREATE",
      byProfileId: actor.id,
      diff: { after: created },
    });
    return created;
  });
  logger.info({ ruleId: rule.id, by: actor.id }, "pricing_rule.create");
  return ok(rule);
}

export async function deletePricingRule(
  id: string,
  actor: Actor,
): Promise<Result<{ id: string }>> {
  await db.$transaction(async (tx) => {
    await tx.pricingRule.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await writeAudit(tx, {
      entity: "PricingRule",
      entityId: id,
      action: "DELETE",
      byProfileId: actor.id,
    });
  });
  logger.info({ ruleId: id, by: actor.id }, "pricing_rule.delete");
  return ok({ id });
}
