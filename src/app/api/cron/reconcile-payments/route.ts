/**
 * Payment reconciliation cron (Phase 7 W3 §6.3).
 *
 * Webhooks can be lost. This cron is the safety net: every 15 minutes it
 * picks up Payments stuck in PENDING for longer than the reconcile window
 * (default 30 minutes) and pulls the authoritative status from the
 * provider. If the provider says CAPTURED, we apply the same audit + state
 * change the webhook path would have applied; if FAILED, we mark it
 * failed; if still pending, we leave it alone and try again on the next
 * tick (until the row exceeds the abandon window — 72h — at which point
 * we flip it to FAILED with a `reason=reconcile_timeout` note in the
 * audit log). FAILED rows are re-fetched so a late capture is applied.
 *
 * Schedule (vercel.json): every 15 minutes.
 * Auth: `Authorization: Bearer ${env.CRON_SECRET}` — same as drain/prune.
 */
import { NextRequest, NextResponse } from "next/server";
import { cronAuthGuard } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { writeAudit } from "@/lib/audit";
import { runWithoutOrg } from "@/lib/org-context";
import { getPaymentProvider } from "@/modules/payments/providers";

export const dynamic = "force-dynamic";

const RECONCILE_AFTER_MS = 30 * 60 * 1000;
const ABANDON_AFTER_MS = 72 * 60 * 60 * 1000;
const BATCH_SIZE = 25;

async function handler(req: NextRequest) {
  const denied = cronAuthGuard(req, "/api/cron/reconcile-payments");
  if (denied) return denied;

  const provider = getPaymentProvider();
  if (provider.name === "MANUAL") {
    return NextResponse.json({ skipped: "manual_provider" });
  }

  return runWithoutOrg("cron:reconcile-payments", async () => {
    const now = Date.now();
    const reconcileBefore = new Date(now - RECONCILE_AFTER_MS);
    const abandonBefore = new Date(now - ABANDON_AFTER_MS);

    const stuck = await db.payment.findMany({
      where: {
        status: { in: ["PENDING", "FAILED"] },
        deletedAt: null,
        providerOrderId: { not: null },
        createdAt: { lt: reconcileBefore },
      },
      orderBy: { createdAt: "asc" },
      take: BATCH_SIZE,
      select: {
        id: true,
        providerOrderId: true,
        createdAt: true,
        status: true,
      },
    });

    let reconciled = 0;
    let abandoned = 0;

    for (const row of stuck) {
      if (!row.providerOrderId) continue;
      try {
        const status = await provider.fetchStatus(row.providerOrderId);
        if (status.status === "CAPTURED") {
          await db.$transaction(async (tx) => {
            await tx.payment.update({
              where: { id: row.id },
              data: {
                status: "CAPTURED",
                capturedAt: new Date(),
                txnRef: status.providerPaymentId ?? undefined,
              },
            });
            await writeAudit(tx, {
              entity: "Payment",
              entityId: row.id,
              action: "STATUS_CHANGE",
              byProfileId: null,
              diff: {
                before: { status: row.status },
                after: { status: "CAPTURED" },
                source: "cron.reconcile-payments",
                providerPaymentId: status.providerPaymentId,
              },
            });
          });
          reconciled += 1;
          continue;
        }

        if (status.status === "FAILED") {
          await db.$transaction(async (tx) => {
            await tx.payment.update({
              where: { id: row.id },
              data: { status: "FAILED" },
            });
            await writeAudit(tx, {
              entity: "Payment",
              entityId: row.id,
              action: "STATUS_CHANGE",
              byProfileId: null,
              diff: {
                before: { status: row.status },
                after: { status: "FAILED" },
                source: "cron.reconcile-payments",
              },
            });
          });
          reconciled += 1;
          continue;
        }

        // Still PENDING per provider — abandon PENDING rows after 72h only.
        if (row.status === "PENDING" && row.createdAt < abandonBefore) {
          await db.$transaction(async (tx) => {
            await tx.payment.update({
              where: { id: row.id },
              data: { status: "FAILED" },
            });
            await writeAudit(tx, {
              entity: "Payment",
              entityId: row.id,
              action: "STATUS_CHANGE",
              byProfileId: null,
              diff: {
                before: { status: row.status },
                after: { status: "FAILED" },
                source: "cron.reconcile-payments",
                reason: "reconcile_timeout",
              },
            });
          });
          abandoned += 1;
        }
      } catch (err) {
        logger.error(
          { paymentId: row.id, err: err instanceof Error ? err.message : String(err) },
          "cron.reconcile-payments.provider_error",
        );
      }
    }

    const processingRefunds = await db.refund.findMany({
      where: {
        status: "PROCESSING",
        providerRefundId: { not: null },
      },
      take: BATCH_SIZE,
      select: { id: true, providerRefundId: true, paymentId: true },
    });
    logger.info(
      { processing: processingRefunds.length },
      "cron.reconcile-payments.processing_refunds",
    );

    return NextResponse.json({
      checked: stuck.length,
      reconciled,
      abandoned,
      processingRefunds: processingRefunds.length,
    });
  });
}

export const GET = handler;
export const POST = handler;
