import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getDriverIdForProfile, getDriverSelfOverview } from "@/modules/drivers/queries/driver-self";
import { StatCard } from "@/components/common/StatCard";
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
    <div className="space-y-5">
      <OverviewHeader driver={data.driver} />

      {data.activeTrip && <ActiveTripBanner trip={data.activeTrip} />}

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Today's trips" value={data.today.count} tone="info" />
        <StatCard
          label="Today's earnings"
          value={`₹${data.today.earnings.toFixed(0)}`}
          tone="success"
        />
        <StatCard label="This week" value={data.week.count} tone="default" />
        <StatCard
          label="Rating"
          value={data.driver.rating != null ? data.driver.rating.toFixed(1) : "—"}
          tone="warning"
        />
      </div>

      <VehicleSummaryCard assignment={data.vehicleAssignment} />

      <RecentTripsList trips={data.recentCompleted} />

      <AttendanceQuickStatus today={data.todayAttendance} />
    </div>
  );
}
