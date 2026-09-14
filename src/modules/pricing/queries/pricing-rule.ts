import { db } from "@/lib/db";

export async function listPricingRules() {
  return db.pricingRule.findMany({
    where: { deletedAt: null },
    include: {
      branch: { select: { id: true, name: true, code: true } },
      bookingType: { select: { id: true, name: true } },
    },
    orderBy: [{ validFrom: "desc" }],
  });
}
