import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import type { BookingStatus } from "@prisma/client";
import { getSessionUser } from "@/lib/auth/session";
import { getDriverIdForProfile } from "@/modules/drivers/queries/driver-self";
import { getDriverBookingDetail } from "@/modules/bookings/queries/driver";
import {
  BOOKING_STATUS_LABEL,
  DRIVER_NEXT_ACTIONS,
  type DriverNextAction,
} from "@/modules/bookings/booking.constants";
import { ClaimButton } from "@/app/(driver)/_components/ClaimButton";
import { TripActionButton } from "@/app/(driver)/_components/TripActionButton";
import { SurfaceCard } from "@/components/common/SurfaceCard";

export const metadata: Metadata = { title: "Trip Detail | CabFleet Driver" };

// Re-export type for TripActionButton prop compatibility
type NextDriverAction = DriverNextAction;

export default async function TripDetailPage({
 params,
}: {
 params: Promise<{ id: string }>;
}) {
 const { id } = await params;
 const session = await getSessionUser();
 if (!session) redirect("/signin");

 const driver = await getDriverIdForProfile(session.profile.id);
 if (!driver?.branchId) {
  redirect("/driver/trips/open");
 }

 const booking = await getDriverBookingDetail(id, {
  driverId: driver.id,
  branchId: driver.branchId,
 });
 if (!booking) notFound();

 const isOpenForClaim = booking.status === "OPEN_FOR_CLAIM";
 const isMyTrip =
  booking.claimedByDriverId === driver.id ||
  booking.assignedDriverId === driver.id;

 // Authorization gate: only the owning driver may view non-open bookings.
 // OPEN_FOR_CLAIM bookings are intentionally visible to all branch drivers
 // (they need to read route details before deciding to claim).
 if (!isOpenForClaim && !isMyTrip) {
  redirect("/driver/trips/open");
 }

 const nextActions: NextDriverAction[] = DRIVER_NEXT_ACTIONS[booking.status] ?? [];

 return (
  <div className="space-y-4">
   {/* Status header */}
   <SurfaceCard padding="sm">
    <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Status</div>
    <div className="text-lg font-semibold text-default">{BOOKING_STATUS_LABEL[booking.status]}</div>
   </SurfaceCard>

   {/* Route */}
   <SurfaceCard padding="sm">
    <div className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">Route</div>
    <div className="space-y-2">
     <div className="flex items-start gap-2">
      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-success" />
      <span className="text-sm text-default">
       {booking.pickupAddress}
      </span>
     </div>
     <div className="ml-1 border-l-2 border-dashed border-default pl-3 text-xs text-muted">
      {format(new Date(booking.pickupAt), "dd MMM yyyy, h:mm a")}
     </div>
     <div className="flex items-start gap-2">
      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-error" />
      <span className="text-sm text-default">
       {booking.dropAddress}
      </span>
     </div>
    </div>
   </SurfaceCard>

   {/* Trip info */}
   <SurfaceCard padding="sm">
    <div className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">Details</div>
    <dl className="grid grid-cols-2 gap-y-2 text-sm">
     <dt className="text-muted">Type</dt>
     <dd className="font-medium text-default">{booking.bookingType.name}</dd>
     <dt className="text-muted">Passengers</dt>
     <dd className="font-medium text-default">{booking.passengers}</dd>
     {booking.fareEstimate && (
      <>
       <dt className="text-muted">Est. Fare</dt>
       <dd className="font-medium text-default">₹{Number(booking.fareEstimate).toFixed(0)}</dd>
      </>
     )}
     {booking.distanceKm && (
      <>
       <dt className="text-muted">Distance</dt>
       <dd className="font-medium text-default">{Number(booking.distanceKm).toFixed(1)} km</dd>
      </>
     )}
    </dl>
   </SurfaceCard>

   {/* Customer info — only shown once the driver owns the trip */}
   {isMyTrip && (
    <SurfaceCard padding="sm">
     <div className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">Customer</div>
     <p className="text-sm font-medium text-default">{booking.customer.profile.fullName ?? "—"}</p>
     {booking.customer.profile.phone && (
      <a
       href={`tel:${booking.customer.profile.phone}`}
       className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
       {booking.customer.profile.phone}
      </a>
     )}
    </SurfaceCard>
   )}

   {/* Actions */}
   <div className="space-y-2">
    {isOpenForClaim && <ClaimButton bookingId={booking.id} />}
    {isMyTrip &&
     nextActions.map((act) => (
      <TripActionButton key={act.toStatus} bookingId={booking.id} action={act} />
     ))}
   </div>
  </div>
 );
}
