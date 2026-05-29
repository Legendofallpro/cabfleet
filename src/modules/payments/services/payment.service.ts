import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { writeAudit } from "@/lib/audit";
import { ok, type Result } from "@/lib/result";
import { logger } from "@/lib/logger";
import { getPaymentProvider } from "@/modules/payments/providers";
import type { ChargeStatus } from "@/modules/payments/providers/PaymentProvider";
import type { PaymentInput } from "@/modules/payments/validators/payment";

type Actor = { id: string };

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

/**
 * Maps the provider-layer `ChargeStatus` to the persisted `PaymentStatus`
 * enum value. Single source of truth so the service + the webhook handler
 * stay in lock-step.
 */
const STATUS_MAP: Record<ChargeStatus, "PENDING" | "CAPTURED" | "FAILED"> = {
  PENDING: "PENDING",
  CAPTURED: "CAPTURED",
  FAILED: "FAILED",
};

/**
 * Create a payment for a booking (Phase 7 W3 §3.4).
 *
 * - Resolves the provider via the factory (`PAYMENT_GATEWAY` env).
 * - Calls `provider.charge` which returns `{ providerRef, status, checkoutUrl? }`.
 * - Persists `Payment` with the provider-returned status — Razorpay payments
 *   are PENDING until the webhook flips them to CAPTURED; manual payments
 *   are CAPTURED at creation.
 * - Returns the persisted payment AND any `checkoutUrl` the caller must
 *   redirect to (Razorpay Checkout).
 */
export async function createPayment(
  input: PaymentInput,
  actor: Actor,
): Promise<Result<{ payment: PaymentRecord; checkoutUrl?: string }>> {
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

  const provider = getPaymentProvider();
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
    // Manual payments capture immediately; gateway payments capture via webhook.
    // For both, providerOrderId is what links the row to the provider; for
    // Manual, providerRef IS the txnRef so we mirror it.
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
      },
    });

    return created;
  });

  logger.info(
    {
      paymentId: payment.id,
      bookingId: input.bookingId,
      provider: provider.name,
      status: payment.status,
      by: actor.id,
    },
    "payment.created",
  );

  return ok({
    payment,
    checkoutUrl: charge.checkoutUrl,
  });
}
