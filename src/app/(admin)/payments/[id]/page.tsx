import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PaymentStatus } from "@prisma/client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { StatusBadge } from "@/components/common/StatusBadge";
import { getPayment } from "@/modules/payments/queries/payment";

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
      <dt className="w-40 shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">
        {label}
      </dt>
      <dd className="text-sm text-gray-800 dark:text-white/90">{value ?? "—"}</dd>
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

  return (
    <div>
      <PageBreadcrumb pageTitle="Payment Detail" />

      <div className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
            Payment #{id.slice(-8).toUpperCase()}
          </h2>
          <StatusBadge tone={STATUS_TONE[payment.status as PaymentStatus]}>
            {STATUS_LABEL[payment.status as PaymentStatus]}
          </StatusBadge>
        </div>

        <dl className="divide-y divide-gray-100 dark:divide-gray-800">
          <DetailRow
            label="Booking"
            value={
              <Link
                href={`/bookings/${payment.bookingId}`}
                className="font-mono text-xs text-brand-600 hover:underline dark:text-brand-400"
              >
                #{payment.bookingId.slice(-8).toUpperCase()}
              </Link>
            }
          />
          <DetailRow
            label="Customer"
            value={
              payment.booking.customer.profile.fullName ??
              payment.booking.customer.profile.email
            }
          />
          <DetailRow label="Amount" value={currency.format(Number(payment.amount))} />
          <DetailRow label="Method" value={payment.method} />
          <DetailRow label="Transaction ref" value={payment.txnRef} />
          <DetailRow
            label="Captured at"
            value={payment.capturedAt ? dtFmt.format(new Date(payment.capturedAt)) : null}
          />
          <DetailRow
            label="Recorded at"
            value={dtFmt.format(new Date(payment.createdAt))}
          />
          <DetailRow
            label="Recorded by"
            value={payment.createdBy?.fullName ?? payment.createdBy?.email}
          />
        </dl>
      </div>
    </div>
  );
}
