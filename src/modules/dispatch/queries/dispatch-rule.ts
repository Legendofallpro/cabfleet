import { db } from "@/lib/db";

export async function listDispatchRules() {
  return db.dispatchRule.findMany({
    where: { deletedAt: null },
    include: {
      branch: { select: { id: true, name: true, code: true } },
      bookingType: { select: { id: true, name: true } },
    },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  });
}
