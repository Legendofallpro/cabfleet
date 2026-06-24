import { Metadata } from "next";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listOpenForClaimBookings } from "@/modules/bookings/queries/driver";
import { ClaimButton } from "@/app/(driver)/_components/ClaimButton";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";

export const metadata: Metadata = { title: "Open Trips | CabFleet Driver" };

export default async function OpenTripsPage() {
  const session = await getSessionUser();
  if (!session) redirect("/signin");

  const driver = await db.driver.findFirst({
    where: { profileId: session.profile.id, deletedAt: null },
    select: { id: true, status: true, profile: { select: { branchId: true } } },
  });

  if (!driver || !driver.profile.branchId) {
    return (
      <SurfaceCard padding="lg">
        <p className="text-sm text-muted text-center">
          Your account is not assigned to a branch yet. Contact an administrator.
        </p>
      </SurfaceCard>
    );
  }

  if (driver.status === "SUSPENDED" || driver.status === "INACTIVE") {
    return (
      <SurfaceCard padding="lg">
        <p className="text-sm font-medium text-on-error-subtle text-center">
          Your account is {driver.status.toLowerCase()}. You cannot claim new trips.
        </p>
      </SurfaceCard>
    );
  }

  const bookings = await listOpenForClaimBookings(driver.profile.branchId);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCount = bookings.filter((b) => new Date(b.pickupAt) >= today).length;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-default">Open Trips</h2>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Available now" value={bookings.length} tone="info" />
        <StatCard label="Today's pickups" value={todayCount} tone="default" />
      </div>

      {bookings.length === 0 ? (
        <SurfaceCard padding="lg">
          <p className="text-sm text-muted text-center">
            No open trips right now. Check back in a moment.
          </p>
        </SurfaceCard>
      ) : (
        bookings.map((booking) => (
          <SurfaceCard key={booking.id} padding="sm">
            <div className="mb-3 flex items-start justify-between">
              <StatusBadge tone="success">Open for Claim</StatusBadge>
              <span className="text-xs text-muted">
                {format(new Date(booking.pickupAt), "dd MMM, h:mm a")}
              </span>
            </div>

            <div className="mb-1 text-sm font-medium text-default">{booking.pickupAddress}</div>
            <div className="mb-4 text-sm text-muted">→ {booking.dropAddress}</div>

            <div className="mb-4 flex items-center gap-4 text-xs text-muted">
              <span>{booking.bookingType.name}</span>
              <span>{booking.passengers} pax</span>
              {booking.fareEstimate && (
                <span className="font-medium text-default">
                  ₹{Number(booking.fareEstimate).toFixed(0)}
                </span>
              )}
            </div>

            <ClaimButton bookingId={booking.id} />
          </SurfaceCard>
        ))
      )}
    </div>
  );
}
