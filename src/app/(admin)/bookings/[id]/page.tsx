import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingStatus } from "@prisma/client";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { StatusBadge } from "@/components/common/StatusBadge";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { BookingTimeline } from "@/modules/bookings/components/BookingTimeline";
import { BookingStatusActions } from "@/modules/bookings/components/BookingStatusActions";
import { BookingAssignForm } from "@/modules/bookings/components/BookingAssignForm";
import { getBooking } from "@/modules/bookings/queries/booking";
import {
 BOOKING_STATUS_LABEL,
 BOOKING_STATUS_TONE,
 DISPATCH_MODE_LABEL,
} from "@/modules/bookings/booking.constants";
import { listAssignableDrivers } from "@/modules/drivers/queries/driver";
import { listAssignableVehicles } from "@/modules/vehicles/queries/vehicle";
import { getInvoiceForBooking } from "@/modules/invoices/queries/invoice";
import { listPaymentsForBooking } from "@/modules/payments/queries/payment";
import { GenerateInvoiceButton } from "@/modules/invoices/components/GenerateInvoiceButton";

export const metadata: Metadata = { title: "Booking Detail | CabFleet Admin" };

const dtFmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeStyle: "short" });
const currency = new Intl.NumberFormat("en-IN", {
 style: "currency",
 currency: "INR",
 maximumFractionDigits: 0,
});

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
 return (
  <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-start sm:gap-4">
   <dt className="w-36 shrink-0 text-xs font-medium text-muted">{label}</dt>
   <dd className="text-sm text-default">{value ?? "—"}</dd>
  </div>
 );
}


export default async function BookingDetailPage({
 params,
}: {
 params: Promise<{ id: string }>;
}) {
 const { id } = await params;

 const booking = await getBooking(id);
 if (!booking) notFound();

 const needsAssign =
  booking.status === BookingStatus.PENDING ||
  booking.status === BookingStatus.CLAIMED;

 const [{ rows: drivers }, { rows: vehicles }] = needsAssign
  ? await Promise.all([
    listAssignableDrivers({ pageSize: 200, branchId: booking.branchId }),
    listAssignableVehicles({ pageSize: 200, branchId: booking.branchId }),
   ])
  : [{ rows: [] as Awaited<ReturnType<typeof listAssignableDrivers>>["rows"] }, { rows: [] as Awaited<ReturnType<typeof listAssignableVehicles>>["rows"] }];

 const [invoice, payments] = await Promise.all([
  getInvoiceForBooking(booking.id),
  listPaymentsForBooking(booking.id),
 ]);

 const bookingRef = booking.id.slice(-8).toUpperCase();

 return (
  <div>
   <PageBreadcrumb pageTitle={`Booking #${bookingRef}`} />

   <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
    {/* ── Left column ── */}
    <div className="space-y-5 lg:col-span-2">

     {/* Summary */}
     <SurfaceCard
      title={<span className="text-base font-semibold">Booking #{bookingRef}</span>}
      actions={<BookingStatusActions bookingId={booking.id} status={booking.status} />}
     >
      <dl className="divide-y divide-default">
       <DetailRow label="Status" value={
        <StatusBadge tone={BOOKING_STATUS_TONE[booking.status]}>
         {BOOKING_STATUS_LABEL[booking.status]}
        </StatusBadge>
       } />
       <DetailRow label="Customer" value={
        <span>
         {booking.customer.profile.fullName ?? booking.customer.profile.email}
         {" "}
         <span className="text-xs text-muted">({booking.customer.profile.email})</span>
        </span>
       } />
       <DetailRow label="Branch" value={`${booking.branch.name} (${booking.branch.code})`} />
       <DetailRow label="Booking type" value={booking.bookingType.name} />
       <DetailRow label="Dispatch mode" value={DISPATCH_MODE_LABEL[booking.dispatchMode]} />
       <DetailRow label="Pickup at" value={dtFmt.format(new Date(booking.pickupAt))} />
       <DetailRow label="Pickup address" value={booking.pickupAddress} />
       <DetailRow label="Drop address" value={booking.dropAddress} />
       <DetailRow label="Passengers" value={booking.passengers} />
       <DetailRow
        label="Distance"
        value={booking.distanceKm != null ? `${Number(booking.distanceKm)} km` : null}
       />
       <DetailRow
        label="Fare estimate"
        value={booking.fareEstimate != null ? currency.format(Number(booking.fareEstimate)) : null}
       />
       <DetailRow
        label="Final fare"
        value={booking.fareFinal != null ? currency.format(Number(booking.fareFinal)) : null}
       />
      </dl>
     </SurfaceCard>

     {/* Assigned resources */}
     {booking.assignedDriver && (
      <SurfaceCard title="Assigned resources">
       <dl className="divide-y divide-default">
        <DetailRow
         label="Driver"
         value={
          <Link href={`/drivers/${booking.assignedDriver.id}`} className="text-primary hover:underline">
           {booking.assignedDriver.profile.fullName ?? booking.assignedDriver.profile.email}
          </Link>
         }
        />
        {booking.assignedVehicle && (
         <DetailRow
          label="Vehicle"
          value={
           <Link href={`/vehicles/${booking.assignedVehicle.id}`} className="text-primary hover:underline">
            {booking.assignedVehicle.registrationNumber} —{" "}
            {booking.assignedVehicle.make} {booking.assignedVehicle.model}
           </Link>
          }
         />
        )}
        {booking.assignedAt && (
         <DetailRow label="Assigned at" value={dtFmt.format(new Date(booking.assignedAt))} />
        )}
        {booking.assignedBy && (
         <DetailRow label="Assigned by" value={booking.assignedBy.fullName ?? booking.assignedBy.email} />
        )}
       </dl>
      </SurfaceCard>
     )}

     {/* Assign / reassign form */}
     {needsAssign && (
      <SurfaceCard title={booking.assignedDriver ? "Reassign driver & vehicle" : "Assign driver & vehicle"}>
       <BookingAssignForm
        bookingId={booking.id}
        drivers={drivers.map((d) => ({
         id: d.id,
         licenseNumber: d.licenseNumber,
         profile: { fullName: d.profile.fullName, email: d.profile.email },
        }))}
        vehicles={vehicles.map((v) => ({
         id: v.id,
         registrationNumber: v.registrationNumber,
         make: v.make,
         model: v.model,
        }))}
        defaultDriverId={booking.assignedDriver?.id ?? ""}
        defaultVehicleId={booking.assignedVehicle?.id ?? ""}
       />
      </SurfaceCard>
     )}

     {/* Invoice */}
     <SurfaceCard
      title="Invoice"
      actions={!invoice ? <GenerateInvoiceButton bookingId={booking.id} /> : undefined}
     >
      {invoice ? (
       <dl className="divide-y divide-default">
        <DetailRow
         label="Invoice #"
         value={
          <Link href={`/invoices/${invoice.id}`} className="text-primary hover:underline">
           {invoice.number}
          </Link>
         }
        />
        <DetailRow label="Status" value={invoice.status} />
        {invoice.pdfUrl && (
         <DetailRow
          label="PDF"
          value={
           <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Download
           </a>
          }
         />
        )}
       </dl>
      ) : (
       <p className="text-xs text-muted">No invoice generated yet.</p>
      )}
     </SurfaceCard>

     {/* Payments */}
     <SurfaceCard
      title="Payments"
      actions={
       <Link
        href={`/payments/new?bookingId=${booking.id}&amount=${booking.fareFinal ?? booking.fareEstimate ?? ""}`}
        className="text-xs text-primary hover:underline"
       >
        + Record payment
       </Link>
      }
     >
      {payments.length === 0 ? (
       <p className="text-xs text-muted">No payments recorded.</p>
      ) : (
       <ul className="divide-y divide-default">
        {payments.map((p) => (
         <li key={p.id} className="flex items-center justify-between py-2">
          <span className="text-xs text-muted">{p.method} · {p.status}</span>
          <Link href={`/payments/${p.id}`} className="text-xs font-medium text-default hover:underline">
           {currency.format(Number(p.amount))}
          </Link>
         </li>
        ))}
       </ul>
      )}
     </SurfaceCard>
    </div>

    {/* ── Right column: timeline ── */}
    <SurfaceCard as="aside">
     <BookingTimeline booking={booking} />
    </SurfaceCard>
   </div>
  </div>
 );
}
