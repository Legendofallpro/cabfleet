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
import { StatCard } from "@/components/common/StatCard";
import type { BookingStatus } from "@prisma/client";

export const metadata: Metadata = { title: "My Trips | CabFleet Driver" };

const ACTIVE_STATUSES = new Set<string>([
  "CLAIMED",
  "ASSIGNED",
  "DRIVER_EN_ROUTE",
  "IN_PROGRESS",
]);

const COMPLETED_STATUSES = new Set<string>(["COMPLETED", "NO_SHOW", "CANCELLED", "FAILED"]);

type TripRow = Awaited<ReturnType<typeof listMyTrips>>[number];

function TripCard({ booking }: { booking: TripRow }) {
  const status = booking.status as BookingStatus;
  const fare = booking.fareFinal ?? booking.fareEstimate;
  return (
    <Link
      href={`/driver/trips/${booking.id}`}
      className="flex items-start justify-between py-3 transition hover:opacity-80"
    >
      <div className="min-w-0 flex-1 pr-3">
        <div className="mb-1 flex items-center gap-2">
          <StatusBadge tone={BOOKING_STATUS_TONE[status]}>
            {BOOKING_STATUS_LABEL[status]}
          </StatusBadge>
          <span className="text-xs text-muted">
            {format(new Date(booking.pickupAt), "dd MMM, h:mm a")}
          </span>
        </div>
        <p className="truncate text-sm font-medium text-default">{booking.pickupAddress}</p>
        <p className="truncate text-xs text-muted">→ {booking.dropAddress}</p>
      </div>
      {fare != null && (
        <p className="shrink-0 text-sm font-semibold text-default">
          ₹{Number(fare).toFixed(0)}
        </p>
      )}
    </Link>
  );
}

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

  const active = bookings.filter((b) => ACTIVE_STATUSES.has(b.status));
  const completed = bookings.filter((b) => COMPLETED_STATUSES.has(b.status));

  // Completed within last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentCompleted = completed.filter(
    (b) => new Date(b.pickupAt) >= thirtyDaysAgo,
  ).length;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-default">My Trips</h2>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Active" value={active.length} tone={active.length > 0 ? "success" : "default"} />
        <StatCard label="Completed (30d)" value={recentCompleted} tone="info" />
      </div>

      {bookings.length === 0 ? (
        <SurfaceCard padding="lg">
          <p className="text-sm text-muted text-center">
            You have no trips yet. Claim an open trip to get started.
          </p>
        </SurfaceCard>
      ) : (
        <>
          {active.length > 0 && (
            <SurfaceCard padding="sm" title="Upcoming & In Progress">
              <ul className="divide-y divide-default">
                {active.map((b) => (
                  <li key={b.id}>
                    <TripCard booking={b} />
                  </li>
                ))}
              </ul>
            </SurfaceCard>
          )}

          {completed.length > 0 && (
            <SurfaceCard padding="sm" title="Completed">
              <ul className="divide-y divide-default">
                {completed.map((b) => (
                  <li key={b.id}>
                    <TripCard booking={b} />
                  </li>
                ))}
              </ul>
            </SurfaceCard>
          )}
        </>
      )}
    </div>
  );
}
