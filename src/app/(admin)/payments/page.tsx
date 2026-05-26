import { Metadata } from "next";
import Link from "next/link";
import { PaymentStatus } from "@prisma/client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { StatusBadge } from "@/components/common/StatusBadge";
import { listPayments } from "@/modules/payments/queries/payment";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Payments | CabFleet Admin",
};

type StatusTone = "success" | "warning" | "error" | "neutral" | "info";

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

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const dtFmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" });

export default async function PaymentsPage() {
  const { rows, total } = await listPayments({ pageSize: 50 });

  type Row = (typeof rows)[0];
  const totalRevenue = rows
    .filter((p: Row) => p.status === "CAPTURED")
    .reduce((sum: number, p: Row) => sum + Number(p.amount), 0);

  const pending = rows.filter((p: Row) => p.status === "PENDING").length;
  const captured = rows.filter((p: Row) => p.status === "CAPTURED").length;
  const refunded = rows.filter((p: Row) => p.status === "REFUNDED").length;

  return (
    <div>
      <PageBreadcrumb pageTitle="Payments" />
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Total Revenue",
              value: currency.format(totalRevenue),
              color: "bg-success-50 dark:bg-success-500/10",
            },
            {
              label: "Pending",
              value: pending,
              color: "bg-warning-50 dark:bg-warning-500/10",
            },
            {
              label: "Captured",
              value: captured,
              color: "bg-brand-50 dark:bg-brand-500/10",
            },
            {
              label: "Refunded",
              value: refunded,
              color: "bg-error-50 dark:bg-error-500/10",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`rounded-2xl border border-gray-200 p-5 dark:border-gray-800 ${stat.color}`}
            >
              <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
              <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
              Payment Transactions
              <span className="ml-2 text-xs font-normal text-gray-400">({total})</span>
            </h2>
            <Link
              href="/payments/new"
              className="inline-flex h-9 items-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600"
            >
              + Record Payment
            </Link>
          </div>

          {rows.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-gray-400 dark:text-gray-600">
              <p className="text-sm">No payment records yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
                    {["Booking", "Customer", "Amount", "Method", "Status", "Date", ""].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {rows.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/bookings/${p.bookingId}`}
                          className="font-mono text-xs text-brand-600 hover:underline dark:text-brand-400"
                        >
                          #{p.bookingId.slice(-8).toUpperCase()}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-gray-700 dark:text-white/80">
                        {p.booking.customer.profile.fullName ??
                          p.booking.customer.profile.email}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-gray-800 dark:text-white/90">
                        {currency.format(Number(p.amount))}
                      </td>
                      <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400">
                        {p.method}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge tone={STATUS_TONE[p.status as PaymentStatus]}>
                          {STATUS_LABEL[p.status as PaymentStatus]}
                        </StatusBadge>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400">
                        {dtFmt.format(new Date(p.createdAt))}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/payments/${p.id}`}
                          className="text-xs text-brand-600 hover:underline dark:text-brand-400"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
