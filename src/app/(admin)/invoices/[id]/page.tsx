import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceStatus } from "@prisma/client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { StatusBadge } from "@/components/common/StatusBadge";
import { VoidInvoiceButton } from "@/modules/invoices/components/VoidInvoiceButton";
import { getInvoice } from "@/modules/invoices/queries/invoice";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Invoice Detail | CabFleet Admin" };

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

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await getInvoice(id);
  if (!invoice) notFound();

  const fare =
    invoice.booking.fareFinal ?? invoice.booking.fareEstimate;
  const isActive = invoice.status !== "VOID";

  return (
    <div>
      <PageBreadcrumb pageTitle={`Invoice ${invoice.number}`} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Details */}
        <div className="lg:col-span-2 space-y-5">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
                  {invoice.number}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge tone={STATUS_TONE[invoice.status as InvoiceStatus]}>
                  {STATUS_LABEL[invoice.status as InvoiceStatus]}
                </StatusBadge>
                {invoice.pdfUrl && (
                  <a
                    href={invoice.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-white/[0.05] dark:text-white/80 dark:hover:bg-white/[0.08]"
                  >
                    Download PDF
                  </a>
                )}
                {isActive && (
                  <VoidInvoiceButton invoiceId={invoice.id} />
                )}
              </div>
            </div>

            <dl className="divide-y divide-gray-100 dark:divide-gray-800">
              <DetailRow
                label="Booking"
                value={
                  <Link
                    href={`/bookings/${invoice.bookingId}`}
                    className="font-mono text-xs text-brand-600 hover:underline dark:text-brand-400"
                  >
                    #{invoice.bookingId.slice(-8).toUpperCase()}
                  </Link>
                }
              />
              <DetailRow
                label="Customer"
                value={
                  invoice.booking.customer.profile.fullName ??
                  invoice.booking.customer.profile.email
                }
              />
              <DetailRow label="Email" value={invoice.booking.customer.profile.email} />
              <DetailRow label="Branch" value={invoice.booking.branch.name} />
              <DetailRow label="Issued at" value={dtFmt.format(new Date(invoice.issuedAt))} />
              <DetailRow
                label="Due at"
                value={invoice.dueAt ? dtFmt.format(new Date(invoice.dueAt)) : null}
              />
              <DetailRow
                label="Amount"
                value={fare != null ? currency.format(Number(fare)) : null}
              />
              <DetailRow
                label="Pickup"
                value={invoice.booking.pickupAddress}
              />
              <DetailRow
                label="Drop"
                value={invoice.booking.dropAddress}
              />
            </dl>
          </section>
        </div>

        {/* Quick links */}
        <aside className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
            Quick links
          </h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link
                href={`/bookings/${invoice.bookingId}`}
                className="text-brand-600 hover:underline dark:text-brand-400"
              >
                View booking
              </Link>
            </li>
            <li>
              <Link
                href={`/payments/new?bookingId=${invoice.bookingId}`}
                className="text-brand-600 hover:underline dark:text-brand-400"
              >
                Record payment
              </Link>
            </li>
            <li>
              <Link
                href="/invoices"
                className="text-gray-500 hover:underline dark:text-gray-400"
              >
                ← All invoices
              </Link>
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
