import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import type { BookingStatus } from "@prisma/client";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getDriverBookingDetail } from "@/modules/bookings/queries/driver";
import { BOOKING_STATUS_LABEL } from "@/modules/bookings/booking.constants";
import { ClaimButton } from "@/app/(driver)/_components/ClaimButton";
import { TripActionButton } from "@/app/(driver)/_components/TripActionButton";

export const metadata: Metadata = { title: "Trip Detail | CabFleet Driver" };

type NextDriverAction = {
  label: string;
  toStatus: BookingStatus;
  variant?: "primary" | "danger" | "secondary";
};

function getNextActions(status: BookingStatus): NextDriverAction[] {
  switch (status) {
    case "ASSIGNED":
      return [{ label: "I'm on my way", toStatus: "DRIVER_EN_ROUTE" }];
    case "DRIVER_EN_ROUTE":
      return [
        { label: "Start Trip", toStatus: "IN_PROGRESS" },
        { label: "Customer No-Show", toStatus: "NO_SHOW", variant: "danger" },
      ];
    case "IN_PROGRESS":
      return [{ label: "Complete Trip", toStatus: "COMPLETED" }];
    default:
      return [];
  }
}

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSessionUser();
  if (!session) redirect("/signin");

  const driver = await db.driver.findUnique({
    where: { profileId: session.profile.id },
    select: { id: true, profile: { select: { branchId: true } } },
  });
  if (!driver?.profile.branchId) {
    redirect("/driver/trips/open");
  }

  const booking = await getDriverBookingDetail(id, {
    driverId: driver.id,
    branchId: driver.profile.branchId,
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

  const nextActions = getNextActions(booking.status);

  return (
    <div className="space-y-4">
      {/* Status header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
          Status
        </div>
        <div className="text-lg font-semibold text-gray-800 dark:text-white/90">
          {BOOKING_STATUS_LABEL[booking.status]}
        </div>
      </div>

      {/* Route */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400">
          Route
        </div>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-green-500" />
            <span className="text-sm text-gray-800 dark:text-white/90">
              {booking.pickupAddress}
            </span>
          </div>
          <div className="ml-1 border-l-2 border-dashed border-gray-200 pl-3 text-xs text-gray-400">
            {format(new Date(booking.pickupAt), "dd MMM yyyy, h:mm a")}
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500" />
            <span className="text-sm text-gray-800 dark:text-white/90">
              {booking.dropAddress}
            </span>
          </div>
        </div>
      </div>

      {/* Trip info */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400">
          Details
        </div>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-gray-500">Type</dt>
          <dd className="font-medium text-gray-800 dark:text-white/90">
            {booking.bookingType.name}
          </dd>
          <dt className="text-gray-500">Passengers</dt>
          <dd className="font-medium text-gray-800 dark:text-white/90">
            {booking.passengers}
          </dd>
          {booking.fareEstimate && (
            <>
              <dt className="text-gray-500">Est. Fare</dt>
              <dd className="font-medium text-gray-800 dark:text-white/90">
                ₹{Number(booking.fareEstimate).toFixed(0)}
              </dd>
            </>
          )}
          {booking.distanceKm && (
            <>
              <dt className="text-gray-500">Distance</dt>
              <dd className="font-medium text-gray-800 dark:text-white/90">
                {Number(booking.distanceKm).toFixed(1)} km
              </dd>
            </>
          )}
        </dl>
      </div>

      {/* Customer info — only shown once the driver owns the trip */}
      {isMyTrip && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400">
            Customer
          </div>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
            {booking.customer.profile.fullName ?? "—"}
          </p>
          {booking.customer.profile.phone && (
            <a
              href={`tel:${booking.customer.profile.phone}`}
              className="mt-1 inline-flex items-center gap-1 text-sm text-brand-500 hover:underline"
            >
              {booking.customer.profile.phone}
            </a>
          )}
        </div>
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
