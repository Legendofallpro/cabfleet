/**
 * /admin/payments/refunds — Refund queue (Phase 7 W3 §7.5 S12).
 *
 * REQUESTED rows are the four-eyes queue: any ADMIN/SUPER_ADMIN other
 * than the requester can approve or reject. Other statuses are shown for
 * recent-activity context.
 */
import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge, type StatusTone } from "@/components/common/StatusBadge";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { getSessionUser } from "@/lib/auth/session";
import { listRefunds } from "@/modules/payments/queries/refund";
import { RefundDecisionButtons } from "@/modules/payments/components/RefundDecisionButtons";
import type { RefundStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Refunds | CabFleet Admin" };
export const dynamic = "force-dynamic";

const STATUS_TONE: Record<RefundStatus, StatusTone> = {
  REQUESTED: "warning",
  PROCESSING: "info",
  SUCCEEDED: "success",
  FAILED: "error",
  REJECTED: "neutral",
};

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

type RefundRow = Awaited<ReturnType<typeof listRefunds>>["rows"][number];

export default async function RefundsQueuePage() {
  const session = await getSessionUser();
  if (
    !session ||
    (session.profile.role !== "ADMIN" &&
      session.profile.role !== "SUPER_ADMIN")
  ) {
    redirect("/");
  }

  const [{ rows: pending }, { rows: recent }] = await Promise.all([
    listRefunds({ status: "REQUESTED", pageSize: 50 }),
    listRefunds({ pageSize: 25 }),
  ]);

  const pendingColumns: Column<RefundRow>[] = [
    {
      header: "Payment",
      cell: (r) => (
        <Link
          href={`/payments/${r.paymentId}`}
          className="font-mono text-xs text-primary hover:underline"
        >
          #{r.paymentId.slice(-8).toUpperCase()}
        </Link>
      ),
    },
    { header: "Amount", cell: (r) => inr.format(Number(r.amount)) },
    { header: "Reason", cell: (r) => r.reason },
    {
      header: "Requested by",
      cell: (r) =>
        r.requestedBy?.fullName ?? r.requestedBy?.email ?? r.requestedById,
    },
    {
      header: "When",
      cell: (r) => new Date(r.createdAt).toLocaleString(),
    },
    {
      header: "",
      cell: (r) =>
        r.requestedById === session.profile.id ? (
          <span className="text-caption text-muted">
            (Your request — needs another admin)
          </span>
        ) : (
          <RefundDecisionButtons refundId={r.id} />
        ),
    },
  ];

  const recentColumns: Column<RefundRow>[] = [
    {
      header: "Status",
      cell: (r) => (
        <StatusBadge tone={STATUS_TONE[r.status]}>{r.status}</StatusBadge>
      ),
    },
    {
      header: "Payment",
      cell: (r) => (
        <Link
          href={`/payments/${r.paymentId}`}
          className="font-mono text-xs text-primary hover:underline"
        >
          #{r.paymentId.slice(-8).toUpperCase()}
        </Link>
      ),
    },
    { header: "Amount", cell: (r) => inr.format(Number(r.amount)) },
    { header: "Reason", cell: (r) => r.reason },
    {
      header: "Approved by",
      cell: (r) =>
        r.approvedBy
          ? (r.approvedBy.fullName ?? r.approvedBy.email)
          : "—",
    },
    {
      header: "When",
      cell: (r) => new Date(r.updatedAt).toLocaleString(),
    },
  ];

  return (
    <div className="space-y-8">
      <PageBreadcrumb pageTitle="Refunds" />

      <section className="space-y-3">
        <header>
          <h2 className="text-default font-semibold">Awaiting approval</h2>
          <p className="text-caption text-muted">
            Four-eyes rule: a refund cannot be approved by its requester.
          </p>
        </header>
        <SurfaceCard>
          <DataTable
            columns={pendingColumns}
            rows={pending}
            rowKey={(r) => r.id}
            empty="No refunds awaiting approval."
          />
        </SurfaceCard>
      </section>

      <section className="space-y-3">
        <header>
          <h2 className="text-default font-semibold">Recent decisions</h2>
        </header>
        <SurfaceCard>
          <DataTable
            columns={recentColumns}
            rows={recent}
            rowKey={(r) => r.id}
            empty="No refunds recorded yet."
          />
        </SurfaceCard>
      </section>
    </div>
  );
}
