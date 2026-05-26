import { db } from "@/lib/db";

const paymentSelect = {
  id: true,
  bookingId: true,
  amount: true,
  method: true,
  status: true,
  txnRef: true,
  capturedAt: true,
  createdAt: true,
  createdById: true,
  createdBy: { select: { id: true, fullName: true, email: true } },
  booking: {
    select: {
      id: true,
      pickupAddress: true,
      dropAddress: true,
      pickupAt: true,
      customer: {
        select: {
          id: true,
          profile: { select: { fullName: true, email: true } },
        },
      },
    },
  },
} as const;

export type PaymentRow = Awaited<ReturnType<typeof listPayments>>["rows"][number];

export async function listPayments(opts?: { pageSize?: number; page?: number }) {
  const pageSize = opts?.pageSize ?? 30;
  const page = opts?.page ?? 1;
  const skip = (page - 1) * pageSize;

  const [rows, total] = await db.$transaction([
    db.payment.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: paymentSelect,
    }),
    db.payment.count({ where: { deletedAt: null } }),
  ]);

  return { rows, total };
}

export async function listPaymentsForBooking(bookingId: string) {
  return db.payment.findMany({
    where: { bookingId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: paymentSelect,
  });
}

export async function getPayment(id: string) {
  return db.payment.findFirst({
    where: { id, deletedAt: null },
    select: paymentSelect,
  });
}
