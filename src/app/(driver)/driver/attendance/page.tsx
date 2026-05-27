import { Metadata } from "next";
import { getSessionUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import {
  getAttendanceForDate,
  listAttendance,
} from "@/modules/attendance/queries/attendance";
import { AttendanceSelfCard } from "@/modules/attendance/components/AttendanceSelfCard";

export const metadata: Metadata = {
  title: "Attendance | CabFleet Driver",
};

const STATUS_LABEL: Record<string, string> = {
  PRESENT: "Present",
  HALF_DAY: "Half Day",
  ABSENT: "Absent",
  ON_LEAVE: "On Leave",
};

const STATUS_COLOR: Record<string, string> = {
  PRESENT: "bg-success-100 text-success-700",
  HALF_DAY: "bg-warning-100 text-warning-700",
  ABSENT: "bg-error-100 text-error-700",
  ON_LEAVE: "bg-brand-100 text-brand-700",
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

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-semibold text-gray-800 dark:text-white/90">
        My Attendance
      </h1>

      <AttendanceSelfCard
        profileId={session.profile.id}
        today={todayStr}
        record={todayRecord}
      />

      {/* Recent history */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="border-b border-gray-100 p-4 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
            Recent History
          </h2>
        </div>
        {history.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-400">
            No attendance records yet.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {history.map((row) => (
              <li key={row.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {new Date(row.date).toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {row.checkIn ? `In: ${new Date(row.checkIn).toLocaleTimeString()}` : "No check-in"}
                    {row.checkOut ? ` · Out: ${new Date(row.checkOut).toLocaleTimeString()}` : ""}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[row.status] ?? ""}`}
                >
                  {STATUS_LABEL[row.status] ?? row.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
