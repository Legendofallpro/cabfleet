import { Metadata } from "next";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { StatCard } from "@/components/common/StatCard";
import { DateRangeFilterBar } from "@/components/common/DateRangeFilterBar";
import { requirePermission } from "@/lib/auth/requireRole";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listShifts } from "@/modules/shifts/queries/shift";
import { listBranches } from "@/modules/branches/queries/branch";
import { listStaff } from "@/modules/staff/queries/staff";
import { ShiftForm } from "@/modules/shifts/components/ShiftForm";
import { DeleteShiftButton } from "@/modules/shifts/components/DeleteShiftButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
 title: "Shifts | CabFleet Admin",
 description: "Manage staff shift schedules",
};

interface Props {
 searchParams: Promise<{
  from?: string;
  to?: string;
  branchId?: string;
  page?: string;
 }>;
}

const dtFmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" });

export default async function ShiftsPage({ searchParams }: Props) {
 await requirePermission(PERMISSIONS.SHIFT_VIEW);

 const params = await searchParams;
 const now = new Date();
 const defaultFrom = new Date(now);
 defaultFrom.setDate(defaultFrom.getDate() - 7);
 const defaultTo = new Date(now);
 defaultTo.setDate(defaultTo.getDate() + 7);

 const from = params.from ? new Date(params.from) : defaultFrom;
 const to = params.to ? new Date(params.to) : defaultTo;
 to.setHours(23, 59, 59, 999);

 const page = Number(params.page ?? 1);
 const branchId = params.branchId || undefined;

 const [{ rows: shifts, total }, { rows: branches }, { rows: staffMembers }] =
  await Promise.all([
   listShifts({ from, to, branchId, page, pageSize: 30 }),
   listBranches({ pageSize: 100 }),
   listStaff({ pageSize: 200 }),
  ]);

 const fromStr = from.toISOString().slice(0, 10);
 const toStr = defaultTo.toISOString().slice(0, 10);

 const branchOptions = branches.map((b) => ({ value: b.id, label: b.name }));
 const staffOptions = staffMembers.map((s) => ({
  value: s.id,
  label: s.profile.fullName ?? s.profile.email,
 }));

 const totalHours = shifts.reduce((sum, s) => {
  const hours = (new Date(s.endsAt).getTime() - new Date(s.startsAt).getTime()) / 3_600_000;
  return sum + hours;
 }, 0);

 return (
  <div>
   <PageBreadcrumb pageTitle="Shifts" />
   <div className="space-y-6">
    <DateRangeFilterBar
     fields={[
      { id: "sh-from", name: "from", label: "From", type: "date", defaultValue: fromStr },
      { id: "sh-to", name: "to", label: "To", type: "date", defaultValue: toStr },
      {
       id: "sh-branch",
       name: "branchId",
       label: "Branch",
       type: "select",
       defaultValue: branchId ?? "",
       options: [
        { value: "", label: "All branches" },
        ...branchOptions,
       ],
      },
     ]}
    />

    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
     <StatCard label="Total Shifts" value={total.toString()} tone="info" />
     <StatCard label="Total Hours" value={`${totalHours.toFixed(1)} h`} tone="default" />
     <StatCard
      label="Assigned"
      value={shifts.filter((s) => s.staffId).length.toString()}
      tone="success"
     />
    </div>

    <ComponentCard title="New Shift" desc="Schedule a shift for a branch or staff member">
     <ShiftForm branches={branchOptions} staffOptions={staffOptions} />
    </ComponentCard>

    <ComponentCard
     title="Shift Schedule"
     desc={`${total} shift${total !== 1 ? "s" : ""} in this period`}
    >
     {shifts.length === 0 ? (
      <div className="flex items-center justify-center py-16 text-muted">
       <p className="text-sm">No shifts scheduled in this period.</p>
      </div>
     ) : (
      <div className="overflow-x-auto">
       <table className="w-full text-left text-sm">
        <thead>
         <tr className="border-b border-default">
          <th className="py-3 pr-4 font-medium text-muted">Branch</th>
          <th className="py-3 pr-4 font-medium text-muted">Staff</th>
          <th className="py-3 pr-4 font-medium text-muted">Starts At</th>
          <th className="py-3 pr-4 font-medium text-muted">Ends At</th>
          <th className="py-3 pr-4 font-medium text-muted">Duration</th>
          <th className="py-3 font-medium text-muted">Actions</th>
         </tr>
        </thead>
        <tbody>
         {shifts.map((shift) => {
          const durationH =
           (new Date(shift.endsAt).getTime() - new Date(shift.startsAt).getTime()) /
           3_600_000;
          return (
           <tr key={shift.id} className="border-b border-default last:border-0">
            <td className="py-3 pr-4 font-medium text-default">{shift.branch.name}</td>
            <td className="py-3 pr-4 text-muted">
             {shift.staff
              ? (shift.staff.profile.fullName ?? shift.staff.profile.email)
              : "Unassigned"}
            </td>
            <td className="py-3 pr-4 text-default">
             {dtFmt.format(new Date(shift.startsAt))}
            </td>
            <td className="py-3 pr-4 text-default">
             {dtFmt.format(new Date(shift.endsAt))}
            </td>
            <td className="py-3 pr-4 text-muted">{durationH.toFixed(1)} h</td>
            <td className="py-3">
             <DeleteShiftButton id={shift.id} />
            </td>
           </tr>
          );
         })}
        </tbody>
       </table>
      </div>
     )}
    </ComponentCard>
   </div>
  </div>
 );
}
