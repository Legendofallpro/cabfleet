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
import { listPaymentsForBooking, getBookingOutstanding } from "@/modules/payments/queries/payment";
import { GenerateInvoiceButton } from "@/modules/invoices/components/GenerateInvoiceButton";
import { DownloadInvoiceButton } from "@/modules/invoices/components/DownloadInvoiceButton";
import { ClearSuspiciousButton } from "@/modules/tracking/components/ClearSuspiciousButton";
import { WhatsAppShareButton } from "@/modules/bookings/components/WhatsAppShareButton";
import { InviteCustomerToPortalButton } from "@/modules/customers/components/InviteCustomerToPortalButton";
import { BookingPendingEditForm } from "@/modules/bookings/components/BookingPendingEditForm";
import { DetailRow } from "@/components/common/DetailRow";
import { env } from "@/lib/env";
import { formatDateTime } from "@/lib/format/datetime";
import { formatMoney } from "@/lib/format/money";
import { requireInstallSettings } from "@/modules/install/queries/install";

export const metadata: Metadata = { title: "Booking Detail | CabFleet Admin" };

export default async function BookingDetailPage({
 params,
}: {
 params: Promise<{ id: string }>;
}) {
 const settings = await requireInstallSettings();
 const dtFmt = (d: Date) =>
  formatDateTime(d, {
   locale: settings.locale,
   timeZone: settings.timezone,
   dateStyle: "long",
   timeStyle: "short",
  });
 const money = (n: number) =>
  formatMoney(n, { locale: settings.locale, currency: settings.currency });

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

 const [invoice, payments, due] = await Promise.all([
  getInvoiceForBooking(booking.id),
  listPaymentsForBooking(booking.id),
  getBookingOutstanding(booking.id),
 ]);

 const bookingRef = booking.id.slice(-8).toUpperCase();

 return (
  <div>
   <PageBreadcrumb pageTitle={`Booking #${bookingRef}`} />

   <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
   {/* ── Left column ── */}
   <div className="space-y-5 lg:col-span-2">

    {/* Suspicious-location override (admin-only; renders nothing when 0). */}
    <ClearSuspiciousButton
     bookingId={booking.id}
     count={booking.suspiciousLocationCount}
    />

    {/* Summary */}
     <SurfaceCard
      title={<span className="text-base font-semibold">Booking #{bookingRef}</span>}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <WhatsAppShareButton
            phone={booking.customer.profile.phone}
            text={[
              `CabFleet booking ${bookingRef}`,
              dtFmt(new Date(booking.pickupAt)),
              `${booking.pickupAddress} → ${booking.dropAddress}`,
              booking.fareEstimate != null ? `Fare ${money(Number(booking.fareEstimate))}` : null,
              booking.customer.staffManaged
                ? null
                : `Track: ${env.NEXT_PUBLIC_APP_URL}/portal/bookings/${booking.id}`,
            ]
              .filter(Boolean)
              .join("\n")}
          />
          {booking.customer.staffManaged ? (
            <InviteCustomerToPortalButton
              customerId={booking.customer.id}
              phone={booking.customer.profile.phone}
            />
          ) : null}
          <BookingStatusActions bookingId={booking.id} status={booking.status} />
        </div>
      }
     >
      <dl className="divide-y divide-default">
       <DetailRow label="Status" value={
        <StatusBadge tone={BOOKING_STATUS_TONE[booking.status]}>
         {BOOKING_STATUS_LABEL[booking.status]}
        </StatusBadge>
       } />
       <DetailRow label="Customer" value={
        <span>
         {booking.customer.profile.fullName ?? booking.customer.profile.phone ?? "Guest"}
         {booking.customer.profile.phone ? (
          <span className="text-xs text-muted"> · {booking.customer.profile.phone}</span>
         ) : null}
        </span>
       } />
       <DetailRow label="Branch" value={`${booking.branch.name} (${booking.branch.code})`} />
       <DetailRow label="Booking type" value={booking.bookingType.name} />
       <DetailRow label="Dispatch mode" value={DISPATCH_MODE_LABEL[booking.dispatchMode]} />
       <DetailRow label="Pickup at" value={dtFmt(new Date(booking.pickupAt))} />
       <DetailRow label="Pickup address" value={booking.pickupAddress} />
       <DetailRow label="Pickup landmark" value={booking.pickupLandmark} />
       <DetailRow label="Drop address" value={booking.dropAddress} />
       <DetailRow label="Drop landmark" value={booking.dropLandmark} />
       <DetailRow label="Passengers" value={booking.passengers} />
       <DetailRow
        label="Distance"
        value={booking.distanceKm != null ? `${Number(booking.distanceKm)} km` : null}
       />
       <DetailRow
        label="Fare estimate"
        value={booking.fareEstimate != null ? money(Number(booking.fareEstimate)) : null}
       />
       <DetailRow
        label="Toll"
        value={Number(booking.tollAmount) > 0 ? money(Number(booking.tollAmount)) : null}
       />
       <DetailRow
        label="Parking"
        value={Number(booking.parkingAmount) > 0 ? money(Number(booking.parkingAmount)) : null}
       />
       <DetailRow
        label="Final fare"
        value={booking.fareFinal != null ? money(Number(booking.fareFinal)) : null}
       />
       <DetailRow label="Notes" value={booking.notes} />
      </dl>
     </SurfaceCard>

     {booking.status === BookingStatus.PENDING && (
      <SurfaceCard title="Edit pending booking">
       <BookingPendingEditForm
        variant="staff"
        cancelHref={`/bookings/${booking.id}`}
        defaults={{
         bookingId: booking.id,
         pickupAtIso: booking.pickupAt.toISOString(),
         pickupAddress: booking.pickupAddress,
         pickupLandmark: booking.pickupLandmark,
         dropAddress: booking.dropAddress,
         dropLandmark: booking.dropLandmark,
         distanceKm: booking.distanceKm != null ? Number(booking.distanceKm) : null,
         passengers: booking.passengers,
         notes: booking.notes,
         fareEstimate: booking.fareEstimate != null ? Number(booking.fareEstimate) : null,
         tollAmount: Number(booking.tollAmount ?? 0),
         parkingAmount: Number(booking.parkingAmount ?? 0),
        }}
       />
      </SurfaceCard>
     )}

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
         <DetailRow label="Assigned at" value={dtFmt(new Date(booking.assignedAt))} />
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
           <span className="flex flex-wrap items-center gap-3">
            <DownloadInvoiceButton invoiceId={invoice.id} label="Download" />
            <WhatsAppShareButton
             phone={booking.customer.profile.phone}
             text={`CabFleet invoice ${invoice.number}\n${env.NEXT_PUBLIC_APP_URL}/portal/bookings/${booking.id}`}
            />
           </span>
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
        href={`/payments/new?bookingId=${booking.id}&amount=${due && due.outstanding > 0 ? due.outstanding : (due?.breakdown.total ?? "")}`}
        className="text-xs text-primary hover:underline"
       >
        + Record payment
       </Link>
      }
     >
      {due && due.outstanding > 0 && (
       <p className="mb-2 text-xs text-muted">
        Outstanding {money(due.outstanding)}
        {due.breakdown.gst > 0 ? ` (incl. GST ${due.breakdown.gstRate}%)` : ""}
       </p>
      )}
      {payments.length === 0 ? (
       <p className="text-xs text-muted">No payments recorded.</p>
      ) : (
       <ul className="divide-y divide-default">
        {payments.map((p) => (
         <li key={p.id} className="flex items-center justify-between py-2">
          <span className="text-xs text-muted">{p.method} · {p.status}</span>
          <Link href={`/payments/${p.id}`} className="text-xs font-medium text-default hover:underline">
           {money(Number(p.amount))}
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
