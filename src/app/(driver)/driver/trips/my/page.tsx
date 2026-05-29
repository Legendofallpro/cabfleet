import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listMyTrips } from "@/modules/bookings/queries/driver";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_TONE } from "@/modules/bookings/booking.constants";
import { StatusBadge } from "@/components/common/StatusBadge";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import type { BookingStatus } from "@prisma/client";

export const metadata: Metadata = { title: "My Trips | CabFleet Driver" };

export default async function MyTripsPage() {
 const session = await getSessionUser();
 if (!session) redirect("/signin");

 const driver = await db.driver.findFirst({
  where: { profileId: session.profile.id, deletedAt: null },
  select: { id: true },
 });
 if (!driver) {
  return (
   <SurfaceCard padding="lg">
    <p className="text-sm text-muted text-center">No driver profile found for your account.</p>
   </SurfaceCard>
  );
 }

 const bookings = await listMyTrips(driver.id);

 return (
  <div className="space-y-4">
   <h2 className="text-lg font-semibold text-default">My Trips</h2>

   {bookings.length === 0 ? (
    <SurfaceCard padding="lg">
     <p className="text-sm text-muted text-center">
      You have no trips yet. Claim an open trip to get started.
     </p>
    </SurfaceCard>
   ) : (
    bookings.map((booking) => (
     <Link
      key={booking.id}
      href={`/driver/trips/${booking.id}`}
      className="block rounded-2xl border border-default bg-surface-elevated p-4 shadow-sm transition hover:border-primary-hover"
     >
      <div className="mb-2 flex items-center justify-between">
       <StatusBadge tone={BOOKING_STATUS_TONE[booking.status as BookingStatus]}>
        {BOOKING_STATUS_LABEL[booking.status as BookingStatus]}
       </StatusBadge>
       <span className="text-xs text-muted">
        {format(new Date(booking.pickupAt), "dd MMM, h:mm a")}
       </span>
      </div>
      <p className="text-sm font-medium text-default">{booking.pickupAddress}</p>
      <p className="mt-0.5 text-sm text-muted">→ {booking.dropAddress}</p>
     </Link>
    ))
   )}
  </div>
 );
}
