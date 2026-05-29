import { Metadata } from "next";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { StatCard } from "@/components/common/StatCard";
import { DateRangeFilterBar } from "@/components/common/DateRangeFilterBar";
import { StatusBadge, type StatusTone } from "@/components/common/StatusBadge";
import {
 listAttendance,
 getAttendanceSummaryForDate,
} from "@/modules/attendance/queries/attendance";

export const metadata: Metadata = {
 title: "Attendance | CabFleet Admin",
 description: "Track driver and staff attendance",
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
    <DateRangeFilterBar
     fields={[{ id: "att-date", name: "date", label: "Date", type: "date", defaultValue: dateStr }]}
    />

    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
     <StatCard label="Present" value={summary.present} tone="success" />
     <StatCard label="Absent"  value={summary.absent}  tone="error" />
     <StatCard label="Half Day" value={summary.halfDay} tone="warning" />
     <StatCard label="On Leave" value={summary.onLeave} tone="info" />
    </div>

    <ComponentCard
     title={`Attendance Log — ${dateStr}`}
     desc={`${total} record${total !== 1 ? "s" : ""} found`}
    >
     {rows.length === 0 ? (
      <div className="flex items-center justify-center py-16 text-muted">
       <p className="text-sm">No attendance records for this date.</p>
      </div>
     ) : (
      <div className="overflow-x-auto">
       <table className="w-full text-left text-sm">
        <thead>
         <tr className="border-b border-default">
          <th className="py-3 pr-4 font-medium text-muted">Name</th>
          <th className="py-3 pr-4 font-medium text-muted">Role</th>
          <th className="py-3 pr-4 font-medium text-muted">Check In</th>
          <th className="py-3 pr-4 font-medium text-muted">Check Out</th>
          <th className="py-3 font-medium text-muted">Status</th>
         </tr>
        </thead>
        <tbody>
         {rows.map((row) => (
          <tr key={row.id} className="border-b border-default last:border-0">
           <td className="py-3 pr-4 font-medium text-default">
            {row.profile.fullName ?? row.profile.email}
           </td>
           <td className="py-3 pr-4 text-muted">{row.profile.role}</td>
           <td className="py-3 pr-4 text-default">
            {row.checkIn ? new Date(row.checkIn).toLocaleTimeString() : "—"}
           </td>
           <td className="py-3 pr-4 text-default">
            {row.checkOut ? new Date(row.checkOut).toLocaleTimeString() : "—"}
           </td>
           <td className="py-3">
            <StatusBadge tone={ATTENDANCE_STATUS_TONE[row.status] ?? "neutral"}>
             {ATTENDANCE_STATUS_LABEL[row.status] ?? row.status}
            </StatusBadge>
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
