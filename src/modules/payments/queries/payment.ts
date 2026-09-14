import { db } from "@/lib/db";
import { gstBreakdown, roundMoney } from "@/modules/invoices/gst";

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

export async function sumCapturedForBooking(bookingId: string): Promise<number> {
  const agg = await db.payment.aggregate({
    where: { bookingId, deletedAt: null, status: "CAPTURED" },
    _sum: { amount: true },
  });
  return Number(agg._sum.amount ?? 0);
}

export type BookingOutstanding = {
  breakdown: ReturnType<typeof gstBreakdown>;
  captured: number;
  outstanding: number;
};

export async function getBookingOutstanding(
  bookingId: string,
): Promise<BookingOutstanding | null> {
  const booking = await db.booking.findFirst({
    where: { id: bookingId, deletedAt: null },
    select: {
      fareEstimate: true,
      fareFinal: true,
      tollAmount: true,
      parkingAmount: true,
      org: { select: { gstRate: true } },
    },
  });
  if (!booking) return null;

  const breakdown = gstBreakdown({
    fareEstimate: booking.fareEstimate != null ? Number(booking.fareEstimate) : null,
    fareFinal: booking.fareFinal != null ? Number(booking.fareFinal) : null,
    tollAmount: Number(booking.tollAmount ?? 0),
    parkingAmount: Number(booking.parkingAmount ?? 0),
    gstRate: booking.org?.gstRate ?? 0,
  });
  const captured = await sumCapturedForBooking(bookingId);
  return {
    breakdown,
    captured,
    outstanding: roundMoney(Math.max(0, breakdown.total - captured)),
  };
}
