import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { writeAudit } from "@/lib/audit";
import { ok, type Result } from "@/lib/result";
import { logger } from "@/lib/logger";
import { ManualPaymentProvider } from "@/modules/payments/providers/ManualPaymentProvider";
import type { PaymentInput } from "@/modules/payments/validators/payment";

type Actor = { id: string };

const provider = new ManualPaymentProvider();

type PaymentRecord = {
  id: string;
  bookingId: string;
  amount: import("@prisma/client").Prisma.Decimal;
  method: string;
  status: string;
  txnRef: string | null;
  capturedAt: Date | null;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

/**
 * Creates a payment record for a booking.
 * Routes through the PaymentProvider so Phase 6 can swap in a real gateway.
 * Writes an AuditLog row inside the same transaction.
 */
export async function createPayment(
  input: PaymentInput,
  actor: Actor,
): Promise<Result<PaymentRecord>> {
  const booking = await db.booking.findFirst({
    where: { id: input.bookingId, deletedAt: null },
    select: { id: true, status: true },
  });

  if (!booking) {
    throw new AppError("NOT_FOUND", "Booking not found.");
  }

  const { txnRef, capturedAt } = await provider.charge({
    bookingId: input.bookingId,
    amount: input.amount,
    method: input.method,
    txnRef: input.txnRef,
    capturedAt: input.capturedAt,
  });

  const payment = await db.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: {
        bookingId: input.bookingId,
        amount: input.amount,
        method: input.method,
        status: "CAPTURED",
        txnRef,
        capturedAt,
        createdById: actor.id,
      },
    });

    await writeAudit(tx, {
      entity: "Payment",
      entityId: created.id,
      action: "CREATE",
      byProfileId: actor.id,
      diff: { after: { ...created, amount: Number(created.amount) } },
    });

    return created;
  });

  logger.info(
    { paymentId: payment.id, bookingId: input.bookingId, by: actor.id },
    "payment.created",
  );

  return ok(payment);
}
