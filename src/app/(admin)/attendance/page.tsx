import { Metadata } from "next";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import {
  listAttendance,
  getAttendanceSummaryForDate,
} from "@/modules/attendance/queries/attendance";

export const metadata: Metadata = {
  title: "Attendance | CabFleet Admin",
  description: "Track driver and staff attendance",
};

const STATUS_LABEL: Record<string, string> = {
  PRESENT: "Present",
  HALF_DAY: "Half Day",
  ABSENT: "Absent",
  ON_LEAVE: "On Leave",
};

const STATUS_COLOR: Record<string, string> = {
  PRESENT: "bg-success-100 text-success-700 dark:bg-success-500/20 dark:text-success-400",
  HALF_DAY: "bg-warning-100 text-warning-700 dark:bg-warning-500/20 dark:text-warning-400",
  ABSENT: "bg-error-100 text-error-700 dark:bg-error-500/20 dark:text-error-400",
  ON_LEAVE: "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400",
};

interface Props {
  searchParams: Promise<{ date?: string; profileId?: string; page?: string }>;
}

export default async function AttendancePage({ searchParams }: Props) {
  const params = await searchParams;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selectedDate = params.date ? new Date(params.date) : today;
  selectedDate.setHours(0, 0, 0, 0);

  const page = Number(params.page ?? 1);

  const [summary, { rows, total }] = await Promise.all([
    getAttendanceSummaryForDate(selectedDate),
    listAttendance({
      from: selectedDate,
      to: selectedDate,
      profileId: params.profileId,
      page,
      pageSize: 50,
    }),
  ]);

  const dateStr = selectedDate.toISOString().slice(0, 10);

  return (
    <div>
      <PageBreadcrumb pageTitle="Attendance" />
      <div className="space-y-6">
        {/* Date filter */}
        <form method="GET" className="flex items-center gap-3">
          <label htmlFor="att-date" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Date
          </label>
          <input
            id="att-date"
            name="date"
            type="date"
            defaultValue={dateStr}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
          <button
            type="submit"
            className="rounded-lg bg-brand-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-600"
          >
            Filter
          </button>
        </form>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Present", value: summary.present, color: "bg-success-50 dark:bg-success-500/10" },
            { label: "Absent", value: summary.absent, color: "bg-error-50 dark:bg-error-500/10" },
            { label: "Half Day", value: summary.halfDay, color: "bg-warning-50 dark:bg-warning-500/10" },
            { label: "On Leave", value: summary.onLeave, color: "bg-brand-50 dark:bg-brand-500/10" },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`rounded-2xl border border-gray-200 dark:border-gray-800 p-5 ${stat.color}`}
            >
              <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
              <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Attendance table */}
        <ComponentCard
          title={`Attendance Log — ${dateStr}`}
          desc={`${total} record${total !== 1 ? "s" : ""} found`}
        >
          {rows.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-gray-400 dark:text-gray-600">
              <p className="text-sm">No attendance records for this date.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="py-3 pr-4 font-medium text-gray-500 dark:text-gray-400">Name</th>
                    <th className="py-3 pr-4 font-medium text-gray-500 dark:text-gray-400">Role</th>
                    <th className="py-3 pr-4 font-medium text-gray-500 dark:text-gray-400">Check In</th>
                    <th className="py-3 pr-4 font-medium text-gray-500 dark:text-gray-400">Check Out</th>
                    <th className="py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-gray-100 last:border-0 dark:border-gray-800"
                    >
                      <td className="py-3 pr-4 font-medium text-gray-800 dark:text-white/90">
                        {row.profile.fullName ?? row.profile.email}
                      </td>
                      <td className="py-3 pr-4 text-gray-500 dark:text-gray-400">
                        {row.profile.role}
                      </td>
                      <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">
                        {row.checkIn ? new Date(row.checkIn).toLocaleTimeString() : "—"}
                      </td>
                      <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">
                        {row.checkOut ? new Date(row.checkOut).toLocaleTimeString() : "—"}
                      </td>
                      <td className="py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[row.status] ?? ""}`}
                        >
                          {STATUS_LABEL[row.status] ?? row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ComponentCard>
      </div>
    </div>
  );
}
