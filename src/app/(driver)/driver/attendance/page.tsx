import { Metadata } from "next";
import { getSessionUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import {
  getAttendanceForDate,
  listAttendance,
} from "@/modules/attendance/queries/attendance";
import { AttendanceSelfCard } from "@/modules/attendance/components/AttendanceSelfCard";
import { StatusBadge, type StatusTone } from "@/components/common/StatusBadge";
import { StatCard } from "@/components/common/StatCard";

export const metadata: Metadata = {
  title: "Attendance | CabFleet Driver",
};

const ATTENDANCE_STATUS_LABEL: Record<string, string> = {
  PRESENT: "Present",
  HALF_DAY: "Half Day",
  ABSENT: "Absent",
  ON_LEAVE: "On Leave",
};

const ATTENDANCE_STATUS_TONE: Record<string, StatusTone> = {
  PRESENT: "success",
  HALF_DAY: "warning",
  ABSENT: "error",
  ON_LEAVE: "info",
};

export default async function DriverAttendancePage() {
  const session = await getSessionUser();
  if (!session) redirect("/signin?redirectTo=/driver/attendance");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  const [todayRecord, { rows: history }] = await Promise.all([
    getAttendanceForDate(session.profile.id, today),
    listAttendance({ profileId: session.profile.id, pageSize: 30 }),
  ]);

  const presentCount = history.filter((r) => r.status === "PRESENT").length;
  const halfDayCount = history.filter((r) => r.status === "HALF_DAY").length;
  const absentCount = history.filter((r) => r.status === "ABSENT").length;

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-semibold text-default">My Attendance</h1>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Present (30d)" value={presentCount} tone="success" />
        <StatCard label="Half Day (30d)" value={halfDayCount} tone="warning" />
        <StatCard label="Absent (30d)" value={absentCount} tone="error" />
      </div>

      <AttendanceSelfCard
        profileId={session.profile.id}
        today={todayStr}
        record={todayRecord}
      />

      <div className="rounded-2xl border border-default bg-surface-elevated">
        <div className="border-b border-default p-4">
          <h2 className="text-sm font-semibold text-default">Recent History</h2>
        </div>
        {history.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted">
            No attendance records yet.
          </p>
        ) : (
          <ul className="divide-y divide-default">
            {history.map((row) => (
              <li key={row.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-default">
                    {new Date(row.date).toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {row.checkIn ? `In: ${new Date(row.checkIn).toLocaleTimeString()}` : "No check-in"}
                    {row.checkOut ? ` · Out: ${new Date(row.checkOut).toLocaleTimeString()}` : ""}
                  </p>
                </div>
                <StatusBadge tone={ATTENDANCE_STATUS_TONE[row.status] ?? "neutral"}>
                  {ATTENDANCE_STATUS_LABEL[row.status] ?? row.status}
                </StatusBadge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
