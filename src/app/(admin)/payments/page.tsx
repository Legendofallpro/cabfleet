import { Metadata } from "next";
import Link from "next/link";
import { PaymentStatus } from "@prisma/client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { SurfaceCard } from "@/components/common/SurfaceCard";
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
       color: "bg-success-subtle",
      },
      {
       label: "Pending",
       value: pending,
       color: "bg-warning-50 dark:bg-warning-500/10",
      },
      {
       label: "Captured",
       value: captured,
       color: "bg-primary-subtle",
      },
      {
       label: "Refunded",
       value: refunded,
       color: "bg-error-subtle dark:bg-error-subtle0/10",
      },
     ].map((stat) => (
      <div
       key={stat.label}
       className={`rounded-2xl border border-default p-5 ${stat.color}`}
      >
       <p className="text-sm text-muted">{stat.label}</p>
       <p className="mt-1 text-2xl font-semibold text-default">
        {stat.value}
       </p>
      </div>
     ))}
    </div>

    {/* Table */}
    <SurfaceCard padding="sm" className="overflow-hidden">
     <div className="flex items-center justify-between border-b border-default px-6 py-4 ">
      <h2 className="text-sm font-semibold text-default">
       Payment Transactions
       <span className="ml-2 text-xs font-normal text-muted">({total})</span>
      </h2>
      <Link
       href="/payments/new"
       className="inline-flex h-9 items-center rounded-lg bg-primary-subtle0 px-4 text-sm font-medium text-white hover:bg-primary-hover"
      >
       + Record Payment
      </Link>
     </div>

     {rows.length === 0 ? (
      <div className="flex items-center justify-center py-16 text-muted">
       <p className="text-sm">No payment records yet.</p>
      </div>
     ) : (
      <div className="overflow-x-auto">
       <table className="w-full text-sm">
        <thead>
         <tr className="border-b border-default bg-surface-inset ">
          {["Booking", "Customer", "Amount", "Method", "Status", "Date", ""].map(
           (h) => (
            <th
             key={h}
             className="px-5 py-3 text-left text-xs font-medium text-muted"
            >
             {h}
            </th>
           ),
          )}
         </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
         {rows.map((p) => (
          <tr key={p.id} className="hover:bg-surface-inset dark:hover:bg-surface-elevated/[0.02]">
           <td className="px-5 py-3.5">
            <Link
             href={`/bookings/${p.bookingId}`}
             className="font-mono text-xs text-primary hover:underline"
            >
             #{p.bookingId.slice(-8).toUpperCase()}
            </Link>
           </td>
           <td className="px-5 py-3.5 text-default">
            {p.booking.customer.profile.fullName ??
             p.booking.customer.profile.email}
           </td>
           <td className="px-5 py-3.5 font-medium text-default">
            {currency.format(Number(p.amount))}
           </td>
           <td className="px-5 py-3.5 text-muted ">
            {p.method}
           </td>
           <td className="px-5 py-3.5">
            <StatusBadge tone={STATUS_TONE[p.status as PaymentStatus]}>
             {STATUS_LABEL[p.status as PaymentStatus]}
            </StatusBadge>
           </td>
           <td className="px-5 py-3.5 text-muted">
            {dtFmt.format(new Date(p.createdAt))}
           </td>
           <td className="px-5 py-3.5 text-right">
            <Link
             href={`/payments/${p.id}`}
             className="text-xs text-primary hover:underline"
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
   </SurfaceCard>
   </div>
  </div>
 );
}
