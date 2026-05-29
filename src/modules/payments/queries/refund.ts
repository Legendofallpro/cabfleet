import { db } from "@/lib/db";

export type ListRefundsParams = {
  status?: "REQUESTED" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "REJECTED";
  page?: number;
  pageSize?: number;
};

export async function listRefunds({
  status,
  page = 1,
  pageSize = 25,
}: ListRefundsParams = {}) {
  const where = status ? { status } : {};
  const [rows, total] = await Promise.all([
    db.refund.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        payment: {
          select: { id: true, bookingId: true, amount: true, method: true },
        },
        requestedBy: { select: { id: true, fullName: true, email: true } },
        approvedBy: { select: { id: true, fullName: true, email: true } },
      },
    }),
    db.refund.count({ where }),
  ]);
  return { rows, total };
}

export function listRefundsForPayment(paymentId: string) {
  return db.refund.findMany({
    where: { paymentId },
    orderBy: { createdAt: "desc" },
    include: {
      requestedBy: { select: { id: true, fullName: true, email: true } },
      approvedBy: { select: { id: true, fullName: true, email: true } },
    },
  });
}
