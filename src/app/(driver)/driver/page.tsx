import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getDriverIdForProfile, getDriverSelfOverview } from "@/modules/drivers/queries/driver-self";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { OverviewHeader } from "@/app/(driver)/_components/OverviewHeader";
import { ActiveTripBanner } from "@/app/(driver)/_components/ActiveTripBanner";
import { VehicleSummaryCard } from "@/app/(driver)/_components/VehicleSummaryCard";
import { RecentTripsList } from "@/app/(driver)/_components/RecentTripsList";
import { AttendanceQuickStatus } from "@/app/(driver)/_components/AttendanceQuickStatus";

export const metadata: Metadata = { title: "Home | CabFleet Driver" };

export default async function DriverHomePage() {
  const session = await getSessionUser();
  if (!session) redirect("/signin?redirectTo=/driver");

  const driver = await getDriverIdForProfile(session.profile.id);

  if (!driver) {
    return (
      <SurfaceCard padding="lg">
        <p className="text-center text-sm text-muted">
          No driver profile found for your account. Contact your administrator.
        </p>
      </SurfaceCard>
    );
  }

  const data = await getDriverSelfOverview(driver.id, session.profile.id);

  if (!data.driver) {
    return (
      <SurfaceCard padding="lg">
        <p className="text-center text-sm text-muted">
          Driver record not found. Please contact support.
        </p>
      </SurfaceCard>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {data.activeTrip ? (
        <ActiveTripBanner trip={data.activeTrip} />
      ) : (
        <SurfaceCard padding="md">
          <p className="text-sm font-medium text-default">No trip right now</p>
          <Link href="/driver/trips/open" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
            Open trips
          </Link>
        </SurfaceCard>
      )}

      <SurfaceCard padding="md">
        <OverviewHeader driver={data.driver} />
        <p className="mt-4 text-sm text-muted">
          Today&apos;s earnings{" "}
          <span className="font-semibold text-default">₹{data.today.earnings.toFixed(0)}</span>
        </p>
      </SurfaceCard>

      <AttendanceQuickStatus today={data.todayAttendance} />

      <VehicleSummaryCard assignment={data.vehicleAssignment} />

      <RecentTripsList trips={data.recentCompleted} />
    </div>
  );
}
