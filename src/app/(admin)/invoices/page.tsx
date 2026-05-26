import { Metadata } from "next";
import Link from "next/link";
import { InvoiceStatus } from "@prisma/client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
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
              color: "bg-brand-50 dark:bg-brand-500/10",
            },
            {
              label: "Issued",
              value: issued,
              color: "bg-success-50 dark:bg-success-500/10",
            },
            {
              label: "Paid",
              value: paid,
              color: "bg-success-50 dark:bg-success-500/10",
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
              Invoice List
              <span className="ml-2 text-xs font-normal text-gray-400">({total})</span>
            </h2>
          </div>

          {rows.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-gray-400 dark:text-gray-600">
              <p className="text-sm">
                No invoices yet. Generate one from a booking detail page.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
                    {["Invoice #", "Booking", "Customer", "Status", "Issued", "Due", ""].map(
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
                  {rows.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                      <td className="px-5 py-3.5 font-mono text-xs font-medium text-gray-800 dark:text-white/90">
                        {inv.number}
                      </td>
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/bookings/${inv.bookingId}`}
                          className="font-mono text-xs text-brand-600 hover:underline dark:text-brand-400"
                        >
                          #{inv.bookingId.slice(-8).toUpperCase()}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-gray-700 dark:text-white/80">
                        {inv.booking.customer.profile.fullName ??
                          inv.booking.customer.profile.email}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge tone={STATUS_TONE[inv.status as InvoiceStatus]}>
                          {STATUS_LABEL[inv.status as InvoiceStatus]}
                        </StatusBadge>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400">
                        {dtFmt.format(new Date(inv.issuedAt))}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400">
                        {inv.dueAt ? dtFmt.format(new Date(inv.dueAt)) : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/invoices/${inv.id}`}
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
          {voided > 0 && (
            <p className="px-6 py-3 text-xs text-gray-400 dark:text-gray-600">
              {voided} voided invoice{voided !== 1 ? "s" : ""} hidden from list.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
