import { Metadata } from "next";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { listDispatchRules } from "@/modules/dispatch/queries/dispatch-rule";
import { DISPATCH_MODE_LABEL } from "@/modules/bookings/booking.constants";
import { CreateDispatchRuleForm } from "@/modules/dispatch/components/CreateDispatchRuleForm";
import { DeleteDispatchRuleButton } from "@/modules/dispatch/components/DeleteDispatchRuleButton";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Dispatch Rules | CabFleet Admin",
};

export const dynamic = "force-dynamic";

export default async function DispatchSettingsPage() {
  const [rules, branches, bookingTypes] = await Promise.all([
    listDispatchRules(),
    db.branch.findMany({
      where: { deletedAt: null, active: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    db.bookingType.findMany({
      where: { deletedAt: null, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
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
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Priority
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Mode
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Branch
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Booking Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Segment
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Status
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rules.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-gray-400"
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
                <tr key={rule.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-mono text-sm text-gray-700 dark:text-gray-300">
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
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {rule.branch ? `${rule.branch.name} (${rule.branch.code})` : "Any"}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {rule.bookingType?.name ?? "Any"}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {rule.customerSegment ?? "Any"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        rule.active
                          ? "text-xs font-medium text-green-600"
                          : "text-xs font-medium text-gray-400"
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
      </div>

      {/* Create form */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">
          Add Rule
        </h3>
        <CreateDispatchRuleForm branches={branches} bookingTypes={bookingTypes} />
      </div>
    </div>
  );
}
