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
 *   - payment.captured  → status: CAPTURED, set capturedAt + txnRef
 *   - payment.failed    → status: FAILED
 *   - refund.processed  → status: REFUNDED (full-refund only; partial-
 *                         refund accounting is deferred until S12's
 *                         Refund table ships)
 */
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { runWithoutOrg } from "@/lib/org-context";

/**
 * Razorpay payload shapes — narrowly typed for the fields we actually read.
 * Anything richer comes from `payload` JSON, which is also persisted to
 * `WebhookEvent.payload` for forensic replay.
 */
type RazorpayEvent = {
  event: string;
  // unix seconds, used by the freshness gate one layer up
  created_at: number;
  payload: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        status?: string;
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

  // S5: bind to local Payment by providerOrderId — never trust notes.
  const payment = await db.payment.findFirst({
    where: { providerOrderId: orderId, deletedAt: null },
    select: { id: true, status: true, orgId: true, bookingId: true },
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

  const now = new Date();
  await db.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "CAPTURED",
        txnRef: paymentId,
        capturedAt: now,
      },
    });
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
  });

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
  // S12 four-eyes flow shipped: Refund rows are the source of truth.
  // - If we find a matching Refund (by providerRefundId), flip it to
  //   SUCCEEDED and update the parent Payment iff the cumulative refunded
  //   amount equals the captured amount (then Payment.status = REFUNDED).
  // - If no Refund row exists, the refund was initiated outside our flow
  //   (Razorpay dashboard / manual ops). We treat it as a full refund and
  //   flip the Payment status; the audit row records the gap.
  const refundEntity = event.payload.refund?.entity;
  const providerRefundId = refundEntity?.id;
  const paymentProviderId = refundEntity?.payment_id;
  if (!paymentProviderId) {
    return { kind: "noop", reason: "missing_payment_id" };
  }

  const payment = await db.payment.findFirst({
    where: { txnRef: paymentProviderId, deletedAt: null },
    select: { id: true, status: true, amount: true },
  });
  if (!payment) {
    return { kind: "noop", reason: "payment_not_found_for_refund" };
  }

  // Look up the Refund by providerRefundId first — that's the four-eyes
  // path. Falls back to a "no row" branch for off-platform refunds.
  const refundRow = providerRefundId
    ? await db.refund.findFirst({
        where: { providerRefundId },
        select: { id: true, status: true, amount: true, paymentId: true },
      })
    : null;

  await db.$transaction(async (tx) => {
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

    // Decide whether the Payment should flip to REFUNDED. Sum SUCCEEDED
    // refunds (including the one we just wrote above) and compare to the
    // captured amount within 1 paisa.
    const successful = await tx.refund.findMany({
      where: { paymentId: payment.id, status: "SUCCEEDED" },
      select: { amount: true },
    });
    const refundedTotal = successful.reduce((s, r) => s + Number(r.amount), 0);
    // If no Refund row at all, the webhook represents an off-platform full
    // refund — treat it as such.
    const isFullRefund =
      (!refundRow && refundEntity) ||
      Math.abs(refundedTotal - Number(payment.amount)) < 0.005;

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
          offPlatform: !refundRow,
        },
      });
    }
  });

  return { kind: "applied", paymentId: payment.id, newStatus: "REFUNDED" };
}
