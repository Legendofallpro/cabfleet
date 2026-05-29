import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PaymentStatus } from "@prisma/client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { StatusBadge, type StatusTone as RefundStatusTone } from "@/components/common/StatusBadge";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { getPayment } from "@/modules/payments/queries/payment";
import { listRefundsForPayment } from "@/modules/payments/queries/refund";
import { RefundRequestForm } from "@/modules/payments/components/RefundRequestForm";
import type { RefundStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Payment Detail | CabFleet Admin" };

type StatusTone = "success" | "warning" | "error" | "neutral";

const STATUS_TONE: Record<PaymentStatus, StatusTone> = {
 PENDING: "warning",
 CAPTURED: "success",
 FAILED: "error",
 REFUNDED: "neutral",
};

const STATUS_LABEL: Record<PaymentStatus, string> = {
 PENDING: "Pending",
 CAPTURED: "Captured",
 FAILED: "Failed",
 REFUNDED: "Refunded",
};

const dtFmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeStyle: "short" });
const currency = new Intl.NumberFormat("en-IN", {
 style: "currency",
 currency: "INR",
 maximumFractionDigits: 0,
});

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
 return (
  <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-start sm:gap-4">
   <dt className="w-40 shrink-0 text-xs font-medium text-muted">{label}</dt>
   <dd className="text-sm text-default">{value ?? "—"}</dd>
  </div>
 );
}

export default async function PaymentDetailPage({
 params,
}: {
 params: Promise<{ id: string }>;
}) {
 const { id } = await params;
 const payment = await getPayment(id);
 if (!payment) notFound();

 const refunds = await listRefundsForPayment(payment.id);
 const refundedTotal = refunds
  .filter((r) => r.status === "SUCCEEDED" || r.status === "PROCESSING" || r.status === "REQUESTED")
  .reduce((sum, r) => sum + Number(r.amount), 0);
 const remaining = Math.max(0, Number(payment.amount) - refundedTotal);
 const refundable = payment.status === "CAPTURED" && remaining > 0.005;

 const REFUND_STATUS_TONE: Record<RefundStatus, RefundStatusTone> = {
  REQUESTED: "warning",
  PROCESSING: "info",
  SUCCEEDED: "success",
  FAILED: "error",
  REJECTED: "neutral",
 };

 return (
  <div>
   <PageBreadcrumb pageTitle="Payment Detail" />

   <div className="mx-auto max-w-2xl">
    <SurfaceCard
     title={<span className="text-base font-semibold">Payment #{id.slice(-8).toUpperCase()}</span>}
     actions={
      <StatusBadge tone={STATUS_TONE[payment.status as PaymentStatus]}>
       {STATUS_LABEL[payment.status as PaymentStatus]}
      </StatusBadge>
     }
    >
     <dl className="divide-y divide-default">
      <DetailRow
       label="Booking"
       value={
        <Link href={`/bookings/${payment.bookingId}`} className="font-mono text-xs text-primary hover:underline">
         #{payment.bookingId.slice(-8).toUpperCase()}
        </Link>
       }
      />
      <DetailRow
       label="Customer"
       value={payment.booking.customer.profile.fullName ?? payment.booking.customer.profile.email}
      />
      <DetailRow label="Amount" value={currency.format(Number(payment.amount))} />
      <DetailRow label="Method" value={payment.method} />
      <DetailRow label="Transaction ref" value={payment.txnRef} />
      <DetailRow
       label="Captured at"
       value={payment.capturedAt ? dtFmt.format(new Date(payment.capturedAt)) : null}
      />
      <DetailRow label="Recorded at" value={dtFmt.format(new Date(payment.createdAt))} />
     <DetailRow label="Recorded by" value={payment.createdBy?.fullName ?? payment.createdBy?.email} />
    </dl>
   </SurfaceCard>

   {refunds.length > 0 && (
    <div className="mt-6">
     <SurfaceCard title={<span className="text-base font-semibold">Refunds</span>}>
      <ul className="divide-y divide-default">
       {refunds.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
         <StatusBadge tone={REFUND_STATUS_TONE[r.status]}>{r.status}</StatusBadge>
         <span className="text-default text-sm">{currency.format(Number(r.amount))}</span>
         <span className="text-caption text-muted">{r.reason}</span>
         <span className="ml-auto text-caption text-muted">
          requested by {r.requestedBy?.fullName ?? r.requestedBy?.email}
          {r.approvedBy ? ` · ${r.status === "REJECTED" ? "rejected" : "approved"} by ${r.approvedBy.fullName ?? r.approvedBy.email}` : ""}
         </span>
        </li>
       ))}
      </ul>
     </SurfaceCard>
    </div>
   )}

   {refundable && (
    <div className="mt-6">
     <SurfaceCard title={<span className="text-base font-semibold">Request a refund</span>}>
      <RefundRequestForm
       paymentId={payment.id}
       capturedAmount={Number(payment.amount)}
       remainingAmount={remaining}
      />
      <p className="mt-3 text-caption text-muted">
       The refund is queued in REQUESTED state. A different admin must approve it from
       <Link href="/payments/refunds" className="ml-1 text-primary hover:underline">/payments/refunds</Link>.
      </p>
     </SurfaceCard>
    </div>
   )}
  </div>
 </div>
 );
}
