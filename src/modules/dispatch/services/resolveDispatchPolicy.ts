/**
 * Reads DispatchRule rows (ordered by priority ASC) and returns the first
 * matching rule's DispatchMode for a given booking context.
 *
 * Matching logic (all optional, null = wildcard):
 *   1. branchId must equal rule.branchId OR rule.branchId is null
 *   2. bookingTypeId must equal rule.bookingTypeId OR rule.bookingTypeId is null
 *   3. customerSegment must equal rule.customerSegment OR rule.customerSegment is null
 *
 * Falls back to MANUAL if no rule matches (should not happen in practice
 * because the seed inserts a priority=1000 global MANUAL fallback).
 */
import { DispatchMode } from "@prisma/client";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export type DispatchPolicyInput = {
  branchId: string;
  bookingTypeId: string;
  /** Optional customer segment tag, e.g. "corporate", "loyalty:gold" */
  customerSegment?: string | null;
};

export type ResolvedPolicy = {
  mode: DispatchMode;
  /** For HYBRID mode: minutes until a PENDING booking is promoted to OPEN_FOR_CLAIM */
  hybridTimeoutMins?: number;
};

export async function resolveDispatchPolicy(
  input: DispatchPolicyInput,
): Promise<ResolvedPolicy> {
  const rules = await db.dispatchRule.findMany({
    where: { active: true, deletedAt: null },
    orderBy: { priority: "asc" },
    select: {
      id: true,
      priority: true,
      branchId: true,
      bookingTypeId: true,
      customerSegment: true,
      mode: true,
      params: true,
    },
  });

  for (const rule of rules) {
    const branchMatch = rule.branchId === null || rule.branchId === input.branchId;
    const typeMatch = rule.bookingTypeId === null || rule.bookingTypeId === input.bookingTypeId;
    const segmentMatch =
      rule.customerSegment === null ||
      rule.customerSegment === (input.customerSegment ?? null);

    if (branchMatch && typeMatch && segmentMatch) {
      logger.debug(
        { ruleId: rule.id, priority: rule.priority, mode: rule.mode },
        "dispatch.policy.matched",
      );

      const policy: ResolvedPolicy = { mode: rule.mode };

      if (rule.mode === DispatchMode.HYBRID) {
        const params = rule.params as Record<string, unknown> | null;
        const mins =
          typeof params?.hybridTimeoutMins === "number"
            ? params.hybridTimeoutMins
            : 5; // safe default
        policy.hybridTimeoutMins = mins;
      }

      return policy;
    }
  }

  // No rule matched — should never happen if the global fallback seed row exists.
  logger.warn(input, "dispatch.policy.no_match — falling back to MANUAL");
  return { mode: DispatchMode.MANUAL };
}
