import { DispatchMode, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ok, type Result } from "@/lib/result";
import { writeAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import type { CreateDispatchRuleInput } from "@/modules/dispatch/validators/dispatch-rule";
import type { DispatchRule } from "@prisma/client";

type Actor = { id: string };

export async function createDispatchRule(
  input: CreateDispatchRuleInput,
  actor: Actor,
): Promise<Result<DispatchRule>> {
  const params: Prisma.InputJsonValue | typeof Prisma.JsonNull =
    input.mode === DispatchMode.HYBRID && input.hybridTimeoutMins
      ? { hybridTimeoutMins: input.hybridTimeoutMins }
      : Prisma.JsonNull;

  const rule = await db.$transaction(async (tx) => {
    const created = await tx.dispatchRule.create({
      data: {
        priority: input.priority,
        branchId: input.branchId ?? null,
        bookingTypeId: input.bookingTypeId ?? null,
        customerSegment: input.customerSegment ?? null,
        mode: input.mode,
        params,
        active: input.active,
      },
    });

    await writeAudit(tx, {
      entity: "DispatchRule",
      entityId: created.id,
      action: "CREATE",
      byProfileId: actor.id,
      diff: { after: created },
    });

    return created;
  });

  logger.info({ ruleId: rule.id, mode: rule.mode, by: actor.id }, "dispatch_rule.create");
  return ok(rule);
}

export async function deleteDispatchRule(
  id: string,
  actor: Actor,
): Promise<Result<{ id: string }>> {
  await db.$transaction(async (tx) => {
    await tx.dispatchRule.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await writeAudit(tx, {
      entity: "DispatchRule",
      entityId: id,
      action: "DELETE",
      byProfileId: actor.id,
    });
  });

  logger.info({ ruleId: id, by: actor.id }, "dispatch_rule.delete");
  return ok({ id });
}
