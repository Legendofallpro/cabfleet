/**
 * Apply a Razorpay webhook event to the local Payment row (Phase 7 W3 §3.3).
 *
 * Security gates baked in:
 *   - S5: server-lookup binding. We look up `Payment` by
 *     `(providerOrderId = event.payload.payment.entity.order_id)` and
 *     ignore the gateway-supplied `notes.bookingId`. If the lookup misses
 *     we log + return ok(noop) so Razorpay doesn't retry forever.
 *   - Webhooks have no session → we never call `requireOrg()`. The Prisma
 *     query runs without tenant filtering because the cron drain + webhook
 *     routes are the only callers; tenant binding is enforced by the
 *     server-side lookup (the Payment row already carries `orgId`).
 *
 * Supported events:
 *   - payment.captured  → status: CAPTURED (PENDING/FAILED only; amount match)
 *   - payment.failed    → status: FAILED
 *   - refund.processed  → Refund SUCCEEDED; Payment REFUNDED only when the
 *                         sum of SUCCEEDED refunds covers the capture
 */
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { runWithoutOrg } from "@/lib/org-context";
import { fromPaise, toPaise } from "@/modules/payments/providers/razorpay/units";

type RazorpayEvent = {
  event: string;
  created_at: number;
  payload: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        status?: string;
        amount?: number;
        currency?: string;
      };
    };
    refund?: {
      entity?: {
        id?: string;
        payment_id?: string;
        amount?: number;
      };
    };
  };
};

export type WebhookOutcome =
  | { kind: "applied"; paymentId: string; newStatus: string }
  | { kind: "noop"; reason: string };

export async function recordPaymentFromWebhook(
  event: RazorpayEvent,
): Promise<WebhookOutcome> {
  const eventType = event.event;
  return runWithoutOrg(`webhook:razorpay:${eventType}`, async () => {
    switch (eventType) {
      case "payment.captured":
        return applyCaptured(event);
      case "payment.failed":
        return applyFailed(event);
      case "refund.processed":
        return applyRefunded(event);
      default:
        logger.info({ eventType }, "razorpay.webhook.ignored");
        return { kind: "noop", reason: `unhandled_event:${eventType}` };
    }
  });
}

async function applyCaptured(event: RazorpayEvent): Promise<WebhookOutcome> {
  const entity = event.payload.payment?.entity;
  const orderId = entity?.order_id;
  const paymentId = entity?.id;
  if (!orderId || !paymentId) {
    return { kind: "noop", reason: "missing_order_or_payment_id" };
  }
  if (entity.currency && entity.currency !== "INR") {
    logger.warn(
      { providerOrderId: orderId, currency: entity.currency },
      "razorpay.webhook.currency_mismatch",
    );
    return { kind: "noop", reason: "currency_mismatch" };
  }
  if (typeof entity.amount !== "number") {
    return { kind: "noop", reason: "missing_amount" };
  }

  const payment = await db.payment.findFirst({
    where: { providerOrderId: orderId, deletedAt: null },
    select: { id: true, status: true, orgId: true, bookingId: true, amount: true },
  });
  if (!payment) {
    logger.warn(
      { providerOrderId: orderId, paymentId },
      "razorpay.webhook.payment_not_found",
    );
    return { kind: "noop", reason: "payment_not_found_for_order" };
  }
  if (payment.status === "CAPTURED") {
    return { kind: "noop", reason: "already_captured" };
  }
  if (payment.status === "REFUNDED") {
    return { kind: "noop", reason: "already_refunded" };
  }
  if (toPaise(payment.amount) !== entity.amount) {
    logger.warn(
      {
        paymentId: payment.id,
        expectedPaise: toPaise(payment.amount),
        gotPaise: entity.amount,
      },
      "razorpay.webhook.amount_mismatch",
    );
    return { kind: "noop", reason: "amount_mismatch" };
  }

  const now = new Date();
  const updated = await db.$transaction(async (tx) => {
    const result = await tx.payment.updateMany({
      where: { id: payment.id, status: { in: ["PENDING", "FAILED"] } },
      data: {
        status: "CAPTURED",
        txnRef: paymentId,
        capturedAt: now,
      },
    });
    if (result.count !== 1) return false;
    await writeAudit(tx, {
      entity: "Payment",
      entityId: payment.id,
      action: "STATUS_CHANGE",
      byProfileId: null,
      diff: {
        before: { status: payment.status },
        after: { status: "CAPTURED", txnRef: paymentId },
        source: "razorpay.webhook.payment.captured",
      },
    });
    return true;
  });

  if (!updated) {
    return { kind: "noop", reason: `not_capturable:${payment.status}` };
  }

  logger.info(
    { paymentId: payment.id, bookingId: payment.bookingId, providerOrderId: orderId },
    "razorpay.webhook.captured",
  );
  return { kind: "applied", paymentId: payment.id, newStatus: "CAPTURED" };
}

async function applyFailed(event: RazorpayEvent): Promise<WebhookOutcome> {
  const entity = event.payload.payment?.entity;
  const orderId = entity?.order_id;
  if (!orderId) return { kind: "noop", reason: "missing_order_id" };

  const payment = await db.payment.findFirst({
    where: { providerOrderId: orderId, deletedAt: null },
    select: { id: true, status: true },
  });
  if (!payment) {
    return { kind: "noop", reason: "payment_not_found_for_order" };
  }
  if (payment.status !== "PENDING") {
    return { kind: "noop", reason: `non_pending_payment:${payment.status}` };
  }

  await db.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED" },
    });
    await writeAudit(tx, {
      entity: "Payment",
      entityId: payment.id,
      action: "STATUS_CHANGE",
      byProfileId: null,
      diff: {
        before: { status: payment.status },
        after: { status: "FAILED" },
        source: "razorpay.webhook.payment.failed",
      },
    });
  });

  return { kind: "applied", paymentId: payment.id, newStatus: "FAILED" };
}

async function applyRefunded(event: RazorpayEvent): Promise<WebhookOutcome> {
  const refundEntity = event.payload.refund?.entity;
  const providerRefundId = refundEntity?.id;
  const paymentProviderId = refundEntity?.payment_id;
  if (!paymentProviderId) {
    return { kind: "noop", reason: "missing_payment_id" };
  }
  if (typeof refundEntity?.amount !== "number") {
    return { kind: "noop", reason: "missing_refund_amount" };
  }

  const payment = await db.payment.findFirst({
    where: { txnRef: paymentProviderId, deletedAt: null },
    select: { id: true, status: true, amount: true, orgId: true },
  });
  if (!payment) {
    return { kind: "noop", reason: "payment_not_found_for_refund" };
  }

  const refundAmount = fromPaise(refundEntity.amount);

  const outcome = await db.$transaction(async (tx) => {
    let refundRow = providerRefundId
      ? await tx.refund.findFirst({
          where: { providerRefundId },
          select: { id: true, status: true, amount: true, paymentId: true },
        })
      : null;

    if (refundRow && refundRow.status !== "SUCCEEDED") {
      await tx.refund.update({
        where: { id: refundRow.id },
        data: {
          status: "SUCCEEDED",
          processedAt: new Date(),
        },
      });
      await writeAudit(tx, {
        entity: "Refund",
        entityId: refundRow.id,
        action: "STATUS_CHANGE",
        byProfileId: null,
        diff: {
          before: { status: refundRow.status },
          after: { status: "SUCCEEDED" },
          source: "razorpay.webhook.refund.processed",
        },
      });
    }

    if (!refundRow) {
      const created = await tx.refund.create({
        data: {
          paymentId: payment.id,
          orgId: payment.orgId,
          amount: refundAmount,
          reason: "Off-platform Razorpay refund",
          status: "SUCCEEDED",
          providerRefundId: providerRefundId ?? undefined,
          requestedById: null,
          processedAt: new Date(),
        },
      });
      refundRow = {
        id: created.id,
        status: created.status,
        amount: created.amount,
        paymentId: created.paymentId,
      };
      await writeAudit(tx, {
        entity: "Refund",
        entityId: created.id,
        action: "CREATE",
        byProfileId: null,
        diff: {
          after: { amount: Number(refundAmount), providerRefundId, offPlatform: true },
          source: "razorpay.webhook.refund.processed",
        },
      });
    }

    const successful = await tx.refund.findMany({
      where: { paymentId: payment.id, status: "SUCCEEDED" },
      select: { amount: true },
    });
    const refundedTotal = successful.reduce((s, r) => s + Number(r.amount), 0);
    const isFullRefund = Math.abs(refundedTotal - Number(payment.amount)) < 0.005;

    if (isFullRefund && payment.status !== "REFUNDED") {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "REFUNDED" },
      });
      await writeAudit(tx, {
        entity: "Payment",
        entityId: payment.id,
        action: "STATUS_CHANGE",
        byProfileId: null,
        diff: {
          before: { status: payment.status },
          after: { status: "REFUNDED" },
          source: "razorpay.webhook.refund.processed",
          refundId: providerRefundId,
        },
      });
      return "REFUNDED";
    }

    return payment.status;
  });

  return { kind: "applied", paymentId: payment.id, newStatus: outcome };
}
