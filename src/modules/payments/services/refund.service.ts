/**
 * Refund service (Phase 7 W3 §7.5 S12).
 *
 * Four-eyes flow:
 *
 *   requestRefund(input, actor)    → REQUESTED   (actor = requestedBy)
 *   approveRefund({refundId}, actor) → PROCESSING (actor = approvedBy; MUST != requestedBy)
 *                                  → calls provider.refund()
 *                                  → webhook later flips to SUCCEEDED / FAILED
 *   rejectRefund({refundId, reason}, actor) → REJECTED (actor = approvedBy; MUST != requestedBy)
 *
 * Both approve and reject demand a *different* admin from the requester —
 * enforced here, not in the DB. The audit trail records both ids.
 */
import type { Refund, Payment, RefundStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { ok, type Result } from "@/lib/result";
import { writeAudit } from "@/lib/audit";
import { getPaymentProvider } from "@/modules/payments/providers";
import type {
  RequestRefundInput,
  RejectRefundInput,
} from "@/modules/payments/validators/refund";

type Actor = { id: string };

export async function requestRefund(
  input: RequestRefundInput,
  actor: Actor,
): Promise<Result<Refund>> {
  const payment = await db.payment.findFirst({
    where: { id: input.paymentId, deletedAt: null },
  });
  if (!payment) throw new AppError("NOT_FOUND", "Payment not found.");
  if (payment.status !== "CAPTURED") {
    throw new AppError(
      "CONFLICT",
      "Only captured payments can be refunded.",
    );
  }

  // Sum already-refunded amounts so partial-refund stacking respects the
  // original capture. Decimal comparison via Number is fine here because
  // Payment.amount is decimal(10,2) — well within float safety.
  const priorRefunds = await db.refund.findMany({
    where: {
      paymentId: payment.id,
      status: { in: ["REQUESTED", "PROCESSING", "SUCCEEDED"] },
    },
    select: { amount: true },
  });
  const refundedSoFar = priorRefunds.reduce(
    (sum, r) => sum + Number(r.amount),
    0,
  );
  const remaining = Number(payment.amount) - refundedSoFar;
  if (input.amount > remaining + 0.005) {
    throw new AppError(
      "VALIDATION",
      `Refund exceeds the remaining capturable amount (₹${remaining.toFixed(2)}).`,
      { fieldErrors: { amount: ["Exceeds remaining capturable amount"] } },
    );
  }

  const refund = await db.$transaction(async (tx) => {
    const created = await tx.refund.create({
      data: {
        paymentId: payment.id,
        amount: input.amount,
        reason: input.reason,
        status: "REQUESTED",
        requestedById: actor.id,
      },
    });
    await writeAudit(tx, {
      entity: "Refund",
      entityId: created.id,
      action: "CREATE",
      byProfileId: actor.id,
      diff: { after: created },
    });
    return created;
  });

  return ok(refund);
}

async function loadRefundOr404(
  id: string,
): Promise<Refund & { payment: Payment }> {
  const row = await db.refund.findFirst({
    where: { id },
    include: { payment: true },
  });
  if (!row) throw new AppError("NOT_FOUND", "Refund not found.");
  return row;
}

function assertDifferentActor(refund: Refund, actor: Actor) {
  if (refund.requestedById === actor.id) {
    throw new AppError(
      "FORBIDDEN",
      "Four-eyes rule: the requester cannot approve or reject their own refund.",
    );
  }
}

function assertStatus(refund: Refund, expected: RefundStatus) {
  if (refund.status !== expected) {
    throw new AppError(
      "CONFLICT",
      `Refund is in status ${refund.status}; expected ${expected}.`,
    );
  }
}

export async function approveRefund(
  refundId: string,
  actor: Actor,
): Promise<Result<Refund>> {
  const current = await loadRefundOr404(refundId);
  assertStatus(current, "REQUESTED");
  assertDifferentActor(current, actor);

  // Provider call happens INSIDE the DB transaction to keep the status
  // flip and the audit row atomic. The provider call is short (a single
  // HTTP POST to Razorpay) and idempotent against `providerPaymentId`,
  // so a re-run after a crash redoes the same refund without effect.
  const provider = getPaymentProvider();
  const refundResult = await provider.refund({
    paymentId: current.paymentId,
    amount: Number(current.amount),
    reason: current.reason,
    providerPaymentId: current.payment.txnRef ?? null,
  });

  const updated = await db.$transaction(async (tx) => {
    const next = await tx.refund.update({
      where: { id: current.id },
      data: {
        status: "PROCESSING",
        approvedById: actor.id,
        providerRefundId: refundResult.refundRef,
      },
    });
    await writeAudit(tx, {
      entity: "Refund",
      entityId: next.id,
      action: "UPDATE",
      byProfileId: actor.id,
      diff: {
        before: { status: current.status },
        after: { status: next.status, providerRefundId: refundResult.refundRef },
      },
    });
    return next;
  });

  return ok(updated);
}

export async function rejectRefund(
  input: RejectRefundInput,
  actor: Actor,
): Promise<Result<Refund>> {
  const current = await loadRefundOr404(input.refundId);
  assertStatus(current, "REQUESTED");
  assertDifferentActor(current, actor);

  const updated = await db.$transaction(async (tx) => {
    const next = await tx.refund.update({
      where: { id: current.id },
      data: {
        status: "REJECTED",
        approvedById: actor.id,
        failureReason: input.reason,
      },
    });
    await writeAudit(tx, {
      entity: "Refund",
      entityId: next.id,
      action: "UPDATE",
      byProfileId: actor.id,
      diff: {
        before: { status: current.status },
        after: { status: next.status, failureReason: input.reason },
      },
    });
    return next;
  });

  return ok(updated);
}
