import { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BookingStatus } from "@prisma/client";

import { getSessionUser } from "@/lib/auth/session";
import { getRoleHome } from "@/lib/auth/redirects";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { StatusBadge } from "@/components/common/StatusBadge";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_TONE } from "@/modules/bookings/booking.constants";
import { CancelBookingButton } from "@/modules/bookings/components/CancelBookingButton";
import { getInvoiceForBooking } from "@/modules/invoices/queries/invoice";
import { listRecentForBooking } from "@/modules/tracking/queries/location";
import LiveTripMapLoader from "@/modules/tracking/components/LiveTripMapLoader";

const IN_TRIP_STATUSES = new Set<BookingStatus>([
  BookingStatus.CLAIMED,
  BookingStatus.ASSIGNED,
  BookingStatus.DRIVER_EN_ROUTE,
  BookingStatus.IN_PROGRESS,
]);

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Booking Detail | CabFleet" };

const dtFmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeStyle: "short" });
const currency = new Intl.NumberFormat("en-IN", {
 style: "currency",
 currency: "INR",
 maximumFractionDigits: 0,
});

const CANCELLABLE = new Set<BookingStatus>(["PENDING", "OPEN_FOR_CLAIM"]);

function Row({ label, value }: { label: string; value: React.ReactNode }) {
 return (
  <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-start sm:gap-4">
   <dt className="w-36 shrink-0 text-xs font-medium text-muted">{label}</dt>
   <dd className="text-sm text-default">{value ?? "—"}</dd>
  </div>
 );
}

export default async function CustomerBookingDetailPage({
 params,
}: {
 params: Promise<{ id: string }>;
}) {
 const { id } = await params;
 const session = await getSessionUser();
 if (!session) redirect("/signin?redirectTo=/portal/bookings");
 if (session.profile.role !== "CUSTOMER") redirect(getRoleHome(session.profile.role));

 const booking = await db.booking.findFirst({
  where: { id, deletedAt: null },
  include: {
   customer: { select: { profileId: true } },
   bookingType: { select: { name: true } },
   branch: { select: { name: true, code: true } },
   assignedDriver: {
    include: { profile: { select: { fullName: true } } },
   },
   assignedVehicle: {
    select: { registrationNumber: true, make: true, model: true },
   },
  },
 });

 if (!booking || booking.customer.profileId !== session.profile.id) notFound();

 const invoice = await getInvoiceForBooking(id);
 const bookingRef = booking.id.slice(-8).toUpperCase();

 const showLiveMap =
  IN_TRIP_STATUSES.has(booking.status as BookingStatus) &&
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
     <Row label="Booking type" value={booking.bookingType.name} />
     <Row label="Branch" value={`${booking.branch.name} (${booking.branch.code})`} />
     <Row label="Pickup at" value={dtFmt.format(new Date(booking.pickupAt))} />
     <Row label="From" value={booking.pickupAddress} />
     <Row label="To" value={booking.dropAddress} />
     <Row label="Passengers" value={booking.passengers} />
     {booking.distanceKm != null && (
      <Row label="Distance" value={`${Number(booking.distanceKm)} km`} />
     )}
     {booking.fareEstimate != null && (
      <Row label="Fare estimate" value={currency.format(Number(booking.fareEstimate))} />
     )}
     {booking.fareFinal != null && (
      <Row
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
