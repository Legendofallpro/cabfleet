import { Metadata } from "next";
import Link from "next/link";
import { InvoiceStatus } from "@prisma/client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { listInvoices } from "@/modules/invoices/queries/invoice";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
 title: "Invoices | CabFleet Admin",
};

type StatusTone = "success" | "warning" | "error" | "neutral" | "info";

const STATUS_TONE: Record<InvoiceStatus, StatusTone> = {
 DRAFT: "neutral",
 ISSUED: "info",
 PAID: "success",
 VOID: "error",
};

const STATUS_LABEL: Record<InvoiceStatus, string> = {
 DRAFT: "Draft",
 ISSUED: "Issued",
 PAID: "Paid",
 VOID: "Void",
};

const dtFmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" });

export default async function InvoicesPage() {
 const { rows, total } = await listInvoices({ pageSize: 50 });

 const issued = rows.filter((i: (typeof rows)[0]) => i.status === "ISSUED").length;
 const paid = rows.filter((i: (typeof rows)[0]) => i.status === "PAID").length;
 const voided = rows.filter((i: (typeof rows)[0]) => i.status === "VOID").length;

 return (
  <div>
   <PageBreadcrumb pageTitle="Invoices" />
   <div className="space-y-6">
    {/* Stats */}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
     {[
      {
       label: "Total Invoices",
       value: total,
       color: "bg-primary-subtle",
      },
      {
       label: "Issued",
       value: issued,
       color: "bg-success-subtle",
      },
      {
       label: "Paid",
       value: paid,
       color: "bg-success-subtle",
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
       Invoice List
       <span className="ml-2 text-xs font-normal text-muted">({total})</span>
      </h2>
     </div>

     {rows.length === 0 ? (
      <div className="flex items-center justify-center py-16 text-muted">
       <p className="text-sm">
        No invoices yet. Generate one from a booking detail page.
       </p>
      </div>
     ) : (
      <div className="overflow-x-auto">
       <table className="w-full text-sm">
        <thead>
         <tr className="border-b border-default bg-surface-inset ">
          {["Invoice #", "Booking", "Customer", "Status", "Issued", "Due", ""].map(
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
         {rows.map((inv) => (
          <tr key={inv.id} className="hover:bg-surface-inset dark:hover:bg-surface-elevated/[0.02]">
           <td className="px-5 py-3.5 font-mono text-xs font-medium text-default">
            {inv.number}
           </td>
           <td className="px-5 py-3.5">
            <Link
             href={`/bookings/${inv.bookingId}`}
             className="font-mono text-xs text-primary hover:underline"
            >
             #{inv.bookingId.slice(-8).toUpperCase()}
            </Link>
           </td>
           <td className="px-5 py-3.5 text-default">
            {inv.booking.customer.profile.fullName ??
             inv.booking.customer.profile.email}
           </td>
           <td className="px-5 py-3.5">
            <StatusBadge tone={STATUS_TONE[inv.status as InvoiceStatus]}>
             {STATUS_LABEL[inv.status as InvoiceStatus]}
            </StatusBadge>
           </td>
           <td className="px-5 py-3.5 text-muted">
            {dtFmt.format(new Date(inv.issuedAt))}
           </td>
           <td className="px-5 py-3.5 text-muted">
            {inv.dueAt ? dtFmt.format(new Date(inv.dueAt)) : "—"}
           </td>
           <td className="px-5 py-3.5 text-right">
            <Link
             href={`/invoices/${inv.id}`}
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
     {voided > 0 && (
      <p className="px-6 py-3 text-xs text-muted">
       {voided} voided invoice{voided !== 1 ? "s" : ""} hidden from list.
      </p>
     )}
   </SurfaceCard>
   </div>
  </div>
 );
}
