import { Metadata } from "next";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { listDispatchRules } from "@/modules/dispatch/queries/dispatch-rule";
import { DISPATCH_MODE_LABEL } from "@/modules/bookings/booking.constants";
import { listActiveBranchesFlat } from "@/modules/branches/queries/branch";
import { listActiveBookingTypesFlat } from "@/modules/bookings/queries/booking";
import { CreateDispatchRuleForm } from "@/modules/dispatch/components/CreateDispatchRuleForm";
import { DeleteDispatchRuleButton } from "@/modules/dispatch/components/DeleteDispatchRuleButton";

export const metadata: Metadata = {
 title: "Dispatch Rules | CabFleet Admin",
};

export const dynamic = "force-dynamic";

export default async function DispatchSettingsPage() {
 const [rules, branches, bookingTypes] = await Promise.all([
  listDispatchRules(),
  listActiveBranchesFlat(),
  listActiveBookingTypesFlat(),
 ]);

 return (
  <div className="space-y-6">
   <PageBreadcrumb pageTitle="Dispatch Rules" />

   {/* Info banner */}
   <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300">
    Rules are evaluated in <strong>priority order</strong> (lower number = higher priority).
    The first matching rule wins. A global fallback rule (priority 1000, MANUAL) is always
    present as the catch-all.
   </div>

   {/* Rules table */}
   <SurfaceCard padding="sm" className="overflow-hidden">
    <table className="w-full text-sm">
     <thead>
      <tr className="border-b border-default">
       <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
        Priority
       </th>
       <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
        Mode
       </th>
       <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
        Branch
       </th>
       <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
        Booking Type
       </th>
       <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
        Segment
       </th>
       <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
        Status
       </th>
       <th className="px-4 py-3" />
      </tr>
     </thead>
     <tbody className="divide-y divide-default">
      {rules.length === 0 && (
       <tr>
        <td
         colSpan={7}
         className="px-4 py-8 text-center text-sm text-muted"
        >
         No dispatch rules found. Run the seed to create the default fallback.
        </td>
       </tr>
      )}
      {rules.map((rule) => {
       const params = rule.params as Record<string, unknown> | null;
       const hybridMins =
        rule.mode === "HYBRID" && typeof params?.hybridTimeoutMins === "number"
         ? params.hybridTimeoutMins
         : null;

       return (
        <tr key={rule.id} className="hover:bg-surface-inset dark:hover:bg-surface-elevated/[0.02]">
         <td className="px-4 py-3 font-mono text-sm text-default">
          {rule.priority}
         </td>
         <td className="px-4 py-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
           {DISPATCH_MODE_LABEL[rule.mode]}
           {hybridMins !== null && (
            <span className="text-indigo-400">{hybridMins}m</span>
           )}
          </span>
         </td>
         <td className="px-4 py-3 text-muted ">
          {rule.branch ? `${rule.branch.name} (${rule.branch.code})` : "Any"}
         </td>
         <td className="px-4 py-3 text-muted ">
          {rule.bookingType?.name ?? "Any"}
         </td>
         <td className="px-4 py-3 text-muted ">
          {rule.customerSegment ?? "Any"}
         </td>
         <td className="px-4 py-3">
          <span
           className={
            rule.active
             ? "text-xs font-medium text-on-success-subtle"
             : "text-xs font-medium text-muted"
           }
          >
           {rule.active ? "Active" : "Inactive"}
          </span>
         </td>
         <td className="px-4 py-3 text-right">
          <DeleteDispatchRuleButton id={rule.id} />
         </td>
        </tr>
       );
      })}
     </tbody>
    </table>
   </SurfaceCard>

   {/* Create form */}
   <SurfaceCard title="Add Rule">
    <CreateDispatchRuleForm branches={branches} bookingTypes={bookingTypes} />
   </SurfaceCard>
  </div>
 );
}
