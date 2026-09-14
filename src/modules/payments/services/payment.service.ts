import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { writeAudit } from "@/lib/audit";
import { ok, type Result } from "@/lib/result";
import { logger } from "@/lib/logger";
import { getPaymentProvider } from "@/modules/payments/providers";
import { ManualPaymentProvider } from "@/modules/payments/providers/ManualPaymentProvider";
import type { ChargeStatus, PaymentProvider } from "@/modules/payments/providers/PaymentProvider";
import type { PaymentInput } from "@/modules/payments/validators/payment";

type Actor = { id: string };

export type CreatePaymentMode = "desk" | "gateway";

type PaymentRecord = {
  id: string;
  bookingId: string;
  amount: import("@prisma/client").Prisma.Decimal;
  method: string;
  status: string;
  providerOrderId: string | null;
  txnRef: string | null;
  capturedAt: Date | null;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

const STATUS_MAP: Record<ChargeStatus, "PENDING" | "CAPTURED" | "FAILED"> = {
  PENDING: "PENDING",
  CAPTURED: "CAPTURED",
  FAILED: "FAILED",
};

/**
 * Create a payment for a booking.
 *
 * - `desk` (default): staff Record Payment. Always Manual — cash/UPI/card
 *   already collected at the desk. Never creates a Razorpay Order.
 * - `gateway`: customer Pay now. Uses the configured Razorpay provider.
 */
export async function createPayment(
  input: PaymentInput,
  actor: Actor,
  options: { mode?: CreatePaymentMode } = {},
): Promise<Result<{ payment: PaymentRecord; checkoutUrl?: string }>> {
  const mode: CreatePaymentMode = options.mode ?? "desk";

  const booking = await db.booking.findFirst({
    where: { id: input.bookingId, deletedAt: null },
    select: {
      id: true,
      status: true,
      customer: {
        select: {
          profile: { select: { email: true, phone: true } },
        },
      },
    },
  });

  if (!booking) {
    throw new AppError("NOT_FOUND", "Booking not found.");
  }

  const provider: PaymentProvider =
    mode === "desk" ? new ManualPaymentProvider() : getPaymentProvider();

  if (mode === "gateway" && provider.name !== "RAZORPAY") {
    throw new AppError("VALIDATION", "Online payment is not available.");
  }

  const charge = await provider.charge({
    bookingId: input.bookingId,
    amount: input.amount,
    method: input.method,
    txnRef: input.txnRef,
    capturedAt: input.capturedAt,
    customerEmail: booking.customer.profile.email,
    customerPhone: booking.customer.profile.phone,
  });

  const payment = await db.$transaction(async (tx) => {
    const status = STATUS_MAP[charge.status];
    const isManualImmediate = provider.name === "MANUAL";
    const created = await tx.payment.create({
      data: {
        bookingId: input.bookingId,
        amount: input.amount,
        method: input.method,
        status,
        providerOrderId: charge.providerRef,
        txnRef: isManualImmediate ? charge.providerRef : null,
        capturedAt: charge.status === "CAPTURED" ? (charge.capturedAt ?? new Date()) : null,
        createdById: actor.id,
      },
    });

    await writeAudit(tx, {
      entity: "Payment",
      entityId: created.id,
      action: "CREATE",
      byProfileId: actor.id,
      diff: {
        after: {
          ...created,
          amount: Number(created.amount),
        },
        provider: provider.name,
        mode,
      },
    });

    return created;
  });

  logger.info(
    {
      paymentId: payment.id,
      bookingId: input.bookingId,
      provider: provider.name,
      mode,
      status: payment.status,
      by: actor.id,
    },
    "payment.created",
  );

  return ok({
    payment,
    checkoutUrl: mode === "gateway" ? charge.checkoutUrl : undefined,
  });
}
