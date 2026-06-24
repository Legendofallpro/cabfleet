import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceStatus } from "@prisma/client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { StatusBadge } from "@/components/common/StatusBadge";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { VoidInvoiceButton } from "@/modules/invoices/components/VoidInvoiceButton";
import { getInvoice } from "@/modules/invoices/queries/invoice";
import { DetailRow } from "@/components/common/DetailRow";

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

export default async function InvoiceDetailPage({
 params,
}: {
 params: Promise<{ id: string }>;
}) {
 const { id } = await params;
 const invoice = await getInvoice(id);
 if (!invoice) notFound();

 const fare = invoice.booking.fareFinal ?? invoice.booking.fareEstimate;
 const isActive = invoice.status !== "VOID";

 return (
  <div>
   <PageBreadcrumb pageTitle={`Invoice ${invoice.number}`} />

   <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
    {/* Details */}
    <div className="lg:col-span-2 space-y-5">
     <SurfaceCard
      title={<span className="text-base font-semibold">{invoice.number}</span>}
      actions={
       <div className="flex items-center gap-3">
        <StatusBadge tone={STATUS_TONE[invoice.status as InvoiceStatus]}>
         {STATUS_LABEL[invoice.status as InvoiceStatus]}
        </StatusBadge>
        {invoice.pdfUrl && (
         <a
          href={invoice.pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center rounded-lg border border-default bg-surface-elevated px-4 text-sm font-medium text-default hover:bg-surface-inset"
         >
          Download PDF
         </a>
        )}
        {isActive && <VoidInvoiceButton invoiceId={invoice.id} />}
       </div>
      }
     >
      <dl className="divide-y divide-default">
       <DetailRow
        label="Booking"
        value={
         <Link href={`/bookings/${invoice.bookingId}`} className="font-mono text-xs text-primary hover:underline">
          #{invoice.bookingId.slice(-8).toUpperCase()}
         </Link>
        }
       />
       <DetailRow
        label="Customer"
        value={invoice.booking.customer.profile.fullName ?? invoice.booking.customer.profile.email}
       />
       <DetailRow label="Email" value={invoice.booking.customer.profile.email} />
       <DetailRow label="Branch" value={invoice.booking.branch.name} />
       <DetailRow label="Issued at" value={dtFmt.format(new Date(invoice.issuedAt))} />
       <DetailRow label="Due at" value={invoice.dueAt ? dtFmt.format(new Date(invoice.dueAt)) : null} />
       <DetailRow label="Amount" value={fare != null ? currency.format(Number(fare)) : null} />
       <DetailRow label="Pickup" value={invoice.booking.pickupAddress} />
       <DetailRow label="Drop" value={invoice.booking.dropAddress} />
      </dl>
     </SurfaceCard>
    </div>

    {/* Quick links */}
    <SurfaceCard as="aside" title="Quick links">
     <ul className="space-y-2 text-sm">
      <li>
       <Link href={`/bookings/${invoice.bookingId}`} className="text-primary hover:underline">
        View booking
       </Link>
      </li>
      <li>
       <Link href={`/payments/new?bookingId=${invoice.bookingId}`} className="text-primary hover:underline">
        Record payment
       </Link>
      </li>
      <li>
       <Link href="/invoices" className="text-muted hover:underline">
        ← All invoices
       </Link>
      </li>
     </ul>
    </SurfaceCard>
   </div>
  </div>
 );
}
