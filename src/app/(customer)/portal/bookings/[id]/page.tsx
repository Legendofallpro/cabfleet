import { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BookingStatus } from "@prisma/client";

import { getSessionUser } from "@/lib/auth/session";
import { getRoleHome } from "@/lib/auth/redirects";
import { env } from "@/lib/env";
import { getCustomerBooking } from "@/modules/customers/queries/customer";
import { StatusBadge } from "@/components/common/StatusBadge";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import {
  BOOKING_STATUS_LABEL,
  BOOKING_STATUS_TONE,
  ACTIVE_BOOKING_STATUSES,
} from "@/modules/bookings/booking.constants";
import { CancelBookingButton } from "@/modules/bookings/components/CancelBookingButton";
import { getInvoiceForBooking } from "@/modules/invoices/queries/invoice";
import { listRecentForBooking } from "@/modules/tracking/queries/location";
import LiveTripMapLoader from "@/modules/tracking/components/LiveTripMapLoader";
import { DetailRow } from "@/components/common/DetailRow";


export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Booking Detail | CabFleet" };

const dtFmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeStyle: "short" });
const currency = new Intl.NumberFormat("en-IN", {
 style: "currency",
 currency: "INR",
 maximumFractionDigits: 0,
});

const CANCELLABLE = new Set<BookingStatus>(["PENDING", "OPEN_FOR_CLAIM"]);

export default async function CustomerBookingDetailPage({
 params,
}: {
 params: Promise<{ id: string }>;
}) {
 const { id } = await params;
 const session = await getSessionUser();
 if (!session) redirect("/signin?redirectTo=/portal/bookings");
 if (session.profile.role !== "CUSTOMER") redirect(getRoleHome(session.profile.role));

 const booking = await getCustomerBooking(id, session.profile.id);
 if (!booking) notFound();

 const invoice = await getInvoiceForBooking(id);
 const bookingRef = booking.id.slice(-8).toUpperCase();

 const showLiveMap =
  ACTIVE_BOOKING_STATUSES.includes(booking.status as BookingStatus) &&
  booking.locationConsentAt !== null;
 const initialPoints = showLiveMap ? await listRecentForBooking(id, 200) : [];

 return (
  <div>
   <div className="mb-6 flex items-center gap-3">
    <Link href="/portal/bookings" className="text-sm text-primary hover:underline">
     ← My Bookings
    </Link>
   </div>

   <SurfaceCard
    title={
     <div>
      <h1 className="text-lg font-bold text-default">Booking #{bookingRef}</h1>
      <p className="mt-0.5 text-xs text-muted">Booked {dtFmt.format(new Date(booking.createdAt))}</p>
     </div>
    }
    actions={
     <div className="flex items-center gap-3">
      <StatusBadge tone={BOOKING_STATUS_TONE[booking.status as BookingStatus]}>
       {BOOKING_STATUS_LABEL[booking.status as BookingStatus]}
      </StatusBadge>
      {CANCELLABLE.has(booking.status as BookingStatus) && (
       <CancelBookingButton bookingId={booking.id} />
      )}
     </div>
    }
   >
    <dl className="divide-y divide-default">
     <DetailRow label="Booking type" value={booking.bookingType.name} />
     <DetailRow label="Branch" value={`${booking.branch.name} (${booking.branch.code})`} />
     <DetailRow label="Pickup at" value={dtFmt.format(new Date(booking.pickupAt))} />
     <DetailRow label="From" value={booking.pickupAddress} />
     <DetailRow label="To" value={booking.dropAddress} />
     <DetailRow label="Passengers" value={booking.passengers} />
     {booking.distanceKm != null && (
      <DetailRow label="Distance" value={`${Number(booking.distanceKm)} km`} />
     )}
     {booking.fareEstimate != null && (
      <DetailRow label="Fare estimate" value={currency.format(Number(booking.fareEstimate))} />
     )}
     {booking.fareFinal != null && (
      <DetailRow
       label="Final fare"
       value={<span className="font-semibold text-default">{currency.format(Number(booking.fareFinal))}</span>}
      />
     )}
    </dl>

    {booking.assignedDriver && (
     <div className="mt-5 rounded-xl bg-surface-inset p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Your Driver</p>
      <p className="text-sm font-medium text-default">
       {booking.assignedDriver.profile.fullName ?? "Driver"}
      </p>
      {booking.assignedVehicle && (
       <p className="mt-0.5 text-xs text-muted">
        {booking.assignedVehicle.make} {booking.assignedVehicle.model} —{" "}
        {booking.assignedVehicle.registrationNumber}
       </p>
      )}
     </div>
    )}

    {showLiveMap && (
     <div className="mt-5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Live Trip Map</p>
      <LiveTripMapLoader
       bookingId={booking.id}
       pickup={
        booking.pickupLat != null && booking.pickupLng != null
         ? { lat: Number(booking.pickupLat), lng: Number(booking.pickupLng) }
         : null
       }
       drop={
        booking.dropLat != null && booking.dropLng != null
         ? { lat: Number(booking.dropLat), lng: Number(booking.dropLng) }
         : null
       }
       initialPoints={initialPoints.map((p) => ({
        lat: p.lat,
        lng: p.lng,
        recordedAt: p.recordedAt.toISOString(),
       }))}
       mapTilesUrl={env.NEXT_PUBLIC_MAP_TILES_URL ?? null}
       supabaseUrl={env.NEXT_PUBLIC_SUPABASE_URL}
       supabaseAnonKey={env.NEXT_PUBLIC_SUPABASE_ANON_KEY}
      />
     </div>
    )}

    {invoice && invoice.pdfUrl && (
     <div className="mt-5 flex items-center justify-between rounded-xl border border-default bg-primary-subtle p-4">
      <div>
       <p className="text-sm font-medium text-on-primary-subtle">Invoice {invoice.number}</p>
       <p className="mt-0.5 text-xs text-on-primary-subtle">Issued {dtFmt.format(new Date(invoice.issuedAt))}</p>
      </div>
      <a
       href={invoice.pdfUrl}
       target="_blank"
       rel="noopener noreferrer"
       className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover"
      >
       Download Invoice
      </a>
     </div>
    )}
   </SurfaceCard>
  </div>
 );
}
