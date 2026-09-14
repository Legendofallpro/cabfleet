import { BookingStatus } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { ok, type Result } from "@/lib/result";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { createPayment } from "@/modules/payments/services/payment.service";
import { getBookingOutstanding } from "@/modules/payments/queries/payment";
import { roundMoney } from "@/modules/invoices/gst";

type Actor = { id: string; customerId: string };

export type CustomerCheckout = {
  orderId: string;
  amountRupees: number;
};

const BILLABLE_STATUSES = new Set<BookingStatus>([
  BookingStatus.COMPLETED,
  BookingStatus.IN_PROGRESS,
  BookingStatus.NO_SHOW,
]);

/**
 * Customer Pay now. Amount is looked up server-side (never from the client).
 * Booking must belong to `actor.customerId` (IDOR).
 */
export async function createCustomerCheckout(
  bookingId: string,
  actor: Actor,
): Promise<Result<CustomerCheckout>> {
  if (env.PAYMENT_GATEWAY !== "RAZORPAY") {
    throw new AppError("VALIDATION", "Online payment is not available.");
  }

  const booking = await db.booking.findFirst({
    where: { id: bookingId, customerId: actor.customerId, deletedAt: null },
    select: { id: true, status: true },
  });
  if (!booking) {
    throw new AppError("NOT_FOUND", "Booking not found.");
  }
  if (!BILLABLE_STATUSES.has(booking.status)) {
    throw new AppError("VALIDATION", "This trip cannot be paid online yet.");
  }

  const due = await getBookingOutstanding(bookingId);
  if (!due || due.outstanding <= 0) {
    throw new AppError("VALIDATION", "This trip is already paid.");
  }

  const outstanding = roundMoney(due.outstanding);

  const pending = await db.payment.findFirst({
    where: {
      bookingId,
      deletedAt: null,
      status: "PENDING",
      providerOrderId: { not: null },
    },
    orderBy: { createdAt: "desc" },
  });
  if (pending?.providerOrderId) {
    if (roundMoney(Number(pending.amount)) === outstanding) {
      return ok({ orderId: pending.providerOrderId, amountRupees: outstanding });
    }
    throw new AppError(
      "CONFLICT",
      "A payment is already in progress for this trip. Wait for it to complete or fail before paying again.",
    );
  }

  const result = await createPayment(
    { bookingId, amount: outstanding, method: "UPI" },
    { id: actor.id },
    { mode: "gateway" },
  );
  if (!result.ok) return result;

  const orderId = result.data.payment.providerOrderId;
  if (!orderId) {
    throw new AppError("INTERNAL", "Payment order was not created.");
  }

  return ok({ orderId, amountRupees: outstanding });
}
