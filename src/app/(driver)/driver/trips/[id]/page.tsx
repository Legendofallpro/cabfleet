import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { getSessionUser } from "@/lib/auth/session";
import { getDriverIdForProfile } from "@/modules/drivers/queries/driver-self";
import { getDriverBookingDetail } from "@/modules/bookings/queries/driver";
import {
  BOOKING_STATUS_LABEL,
  DRIVER_NEXT_ACTIONS,
  IN_TRIP_STATUSES,
  type DriverNextAction,
} from "@/modules/bookings/booking.constants";
import { TripActionBar } from "@/app/(driver)/_components/TripActionBar";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { DriverLocationPublisher } from "@/modules/tracking/components/DriverLocationPublisher";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Trip Detail | CabFleet Driver" };

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

  if (!isOpenForClaim && !isMyTrip) {
    redirect("/driver/trips/open");
  }

  const nextActions: DriverNextAction[] = DRIVER_NEXT_ACTIONS[booking.status] ?? [];
  const publishLocation =
    env.REALTIME_TRACKING_ENABLED &&
    Boolean(booking.locationConsentAt) &&
    IN_TRIP_STATUSES.includes(booking.status);
  const navigateAddress =
    booking.status === "IN_PROGRESS"
      ? [booking.dropAddress, booking.dropLandmark].filter(Boolean).join(", ")
      : [booking.pickupAddress, booking.pickupLandmark].filter(Boolean).join(", ");

  return (
    <div className="space-y-4 pb-40">
      <DriverLocationPublisher bookingId={booking.id} enabled={publishLocation} />
      <SurfaceCard padding="sm">
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Status</div>
        <div className="text-lg font-semibold text-default">
          {BOOKING_STATUS_LABEL[booking.status]}
        </div>
      </SurfaceCard>

      <SurfaceCard padding="sm">
        <div className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">Route</div>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-success" />
            <span className="text-sm text-default">
              {booking.pickupAddress}
              {booking.pickupLandmark ? ` (${booking.pickupLandmark})` : ""}
            </span>
          </div>
          <div className="ml-1 border-l-2 border-dashed border-default pl-3 text-xs text-muted">
            {format(new Date(booking.pickupAt), "dd MMM yyyy, h:mm a")}
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-error" />
            <span className="text-sm text-default">
              {booking.dropAddress}
              {booking.dropLandmark ? ` (${booking.dropLandmark})` : ""}
            </span>
          </div>
        </div>
      </SurfaceCard>

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

      {isMyTrip && (
        <SurfaceCard padding="sm">
          <div className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">Customer</div>
          <p className="text-sm font-medium text-default">{booking.customer.profile.fullName ?? "—"}</p>
          {booking.customer.profile.phone && (
            <p className="mt-1 text-sm text-muted">{booking.customer.profile.phone}</p>
          )}
        </SurfaceCard>
      )}

      <TripActionBar
        bookingId={booking.id}
        customerPhone={isMyTrip ? booking.customer.profile.phone : null}
        navigateAddress={navigateAddress}
        isOpenForClaim={isOpenForClaim}
        isMyTrip={isMyTrip}
        nextActions={nextActions}
      />
    </div>
  );
}
