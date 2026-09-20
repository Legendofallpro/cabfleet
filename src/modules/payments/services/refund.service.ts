/**
 * Refund service (Phase 7 W3 §7.5 S12).
 *
 * Four-eyes flow:
 *
 *   requestRefund(input, actor)    → REQUESTED   (actor = requestedBy)
 *   approveRefund({refundId}, actor) → PROCESSING (actor = approvedBy; MUST != requestedBy)
 *                                  → claims the row, then calls provider.refund()
 *                                  → webhook later flips to SUCCEEDED / FAILED
 *   rejectRefund({refundId, reason}, actor) → REJECTED (actor = approvedBy; MUST != requestedBy)
 *
 * Both approve and reject demand a *different* admin from the requester —
 * enforced here, not in the DB. The audit trail records both ids.
 */
import type { Refund, Payment, RefundStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { currentOrgId } from "@/lib/org-context";
import { AppError } from "@/lib/errors";
import { ok, type Result } from "@/lib/result";
import { writeAudit } from "@/lib/audit";
import { getInstallSettings } from "@/modules/install/queries/install";
import { getPaymentProvider } from "@/modules/payments/providers";
import type {
  RequestRefundInput,
  RejectRefundInput,
} from "@/modules/payments/validators/refund";

type Actor = { id: string };

const OPEN_REFUND_STATUSES = ["REQUESTED", "PROCESSING", "SUCCEEDED"] as const;

export async function requestRefund(
  input: RequestRefundInput,
  actor: Actor,
): Promise<Result<Refund>> {
  const refund = await db.$transaction(async (tx) => {
    const orgId = currentOrgId();
    const locked = await tx.$queryRaw<{ id: string; status: string; amount: unknown }[]>`
      SELECT id, status, amount
      FROM "Payment"
      WHERE id = ${input.paymentId}
        AND "deletedAt" IS NULL
        AND (${orgId}::text IS NULL OR "orgId" = ${orgId})
      FOR UPDATE
    `;
    const payment = locked[0];
    if (!payment) throw new AppError("NOT_FOUND", "Payment not found.");
    if (payment.status !== "CAPTURED") {
      throw new AppError(
        "CONFLICT",
        "Only captured payments can be refunded.",
      );
    }

    const priorRefunds = await tx.refund.findMany({
      where: {
        paymentId: payment.id,
        status: { in: [...OPEN_REFUND_STATUSES] },
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
  const claimed = await db.$transaction(async (tx) => {
    const current = await tx.refund.findFirst({
      where: { id: refundId },
      include: { payment: true },
    });
    if (!current) throw new AppError("NOT_FOUND", "Refund not found.");
    assertStatus(current, "REQUESTED");
    assertDifferentActor(current, actor);

    const orgId = currentOrgId();
    await tx.$queryRaw`
      SELECT id FROM "Payment"
      WHERE id = ${current.paymentId}
        AND (${orgId}::text IS NULL OR "orgId" = ${orgId})
      FOR UPDATE
    `;
    await tx.$queryRaw`
      SELECT id FROM "Refund"
      WHERE id = ${refundId}
        AND (${orgId}::text IS NULL OR "orgId" = ${orgId})
      FOR UPDATE
    `;

    const priorRefunds = await tx.refund.findMany({
      where: {
        paymentId: current.paymentId,
        status: { in: [...OPEN_REFUND_STATUSES] },
        NOT: { id: refundId },
      },
      select: { amount: true },
    });
    const refundedSoFar = priorRefunds.reduce(
      (sum, r) => sum + Number(r.amount),
      0,
    );
    const remaining = Number(current.payment.amount) - refundedSoFar;
    if (Number(current.amount) > remaining + 0.005) {
      throw new AppError(
        "VALIDATION",
        `Refund exceeds the remaining capturable amount (₹${remaining.toFixed(2)}).`,
      );
    }

    const claimedRows = await tx.refund.updateMany({
      where: { id: refundId, status: "REQUESTED" },
      data: { status: "PROCESSING", approvedById: actor.id },
    });
    if (claimedRows.count !== 1) {
      throw new AppError(
        "CONFLICT",
        "Refund is no longer awaiting approval.",
      );
    }

    const next = await tx.refund.findFirst({
      where: { id: refundId },
      include: { payment: true },
    });
    if (!next) throw new AppError("NOT_FOUND", "Refund not found.");
    await writeAudit(tx, {
      entity: "Refund",
      entityId: next.id,
      action: "UPDATE",
      byProfileId: actor.id,
      diff: {
        before: { status: "REQUESTED" },
        after: { status: "PROCESSING" },
      },
    });
    return next;
  });

  if (claimed.providerRefundId) {
    return ok(claimed);
  }

  const settings = await getInstallSettings();
  const provider = getPaymentProvider(settings?.country ?? "");
  try {
    const refundResult = await provider.refund({
      paymentId: claimed.paymentId,
      amount: Number(claimed.amount),
      reason: claimed.reason,
      providerPaymentId: claimed.payment.txnRef ?? null,
    });

    const updated = await db.refund.update({
      where: { id: claimed.id },
      data: { providerRefundId: refundResult.refundRef },
    });
    return ok(updated);
  } catch (err) {
    await db.refund.updateMany({
      where: { id: claimed.id, status: "PROCESSING" },
      data: { status: "REQUESTED", approvedById: null, failureReason: String(err) },
    });
    throw err;
  }
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
