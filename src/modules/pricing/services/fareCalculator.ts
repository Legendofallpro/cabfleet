/**
 * Fare estimation service.
 *
 * Finds the most specific PricingRule for a booking (branch-specific first,
 * then global fallback for the BookingType) and applies:
 *   fare = baseFare + perKm * distanceKm + perMin * durationMin
 *
 * Returns null if no matching rule is found (caller should warn the user).
 */
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export type FareInput = {
  bookingTypeId: string;
  branchId: string;
  distanceKm?: number | null;
  durationMin?: number | null;
};

export type FareResult = {
  ruleId: string;
  baseFare: number;
  perKm: number;
  perMin: number;
  distanceKm: number;
  durationMin: number;
  total: number;
};

export async function estimateFare(input: FareInput): Promise<FareResult | null> {
  const now = new Date();

  // Find the most specific valid rule: branch-specific first, then global
  const rule = await db.pricingRule.findFirst({
    where: {
      bookingTypeId: input.bookingTypeId,
      deletedAt: null,
      OR: [{ branchId: input.branchId }, { branchId: null }],
      validFrom: { lte: now },
      OR: [{ validTo: null }, { validTo: { gte: now } }],
    },
    orderBy: [
      // Branch-specific rules (branchId is not null) sort first
      { branchId: "desc" },
      { validFrom: "desc" },
    ],
  });

  if (!rule) {
    logger.warn({ bookingTypeId: input.bookingTypeId, branchId: input.branchId }, "No pricing rule found");
    return null;
  }

  const baseFare = Number(rule.baseFare);
  const perKm = Number(rule.perKm);
  const perMin = Number(rule.perMin);
  const distanceKm = input.distanceKm ?? 0;
  const durationMin = input.durationMin ?? 0;
  const total = baseFare + perKm * distanceKm + perMin * durationMin;

  return {
    ruleId: rule.id,
    baseFare,
    perKm,
    perMin,
    distanceKm,
    durationMin,
    total: Math.round(total * 100) / 100,
  };
}
