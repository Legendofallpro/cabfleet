import { Metadata } from "next";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { StatCard } from "@/components/common/StatCard";
import { DateRangeFilterBar } from "@/components/common/DateRangeFilterBar";
import { requirePermission } from "@/lib/auth/requireRole";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listExpenses } from "@/modules/expenses/queries/expense";
import { ExpenseForm } from "@/modules/expenses/components/ExpenseForm";
import { EXPENSE_CATEGORIES } from "@/modules/expenses/validators/expense";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Expenses | CabFleet Admin",
  description: "Track operational expenses across the fleet",
};

const CATEGORY_LABELS: Record<string, string> = {
  FUEL: "Fuel",
  MAINTENANCE: "Maintenance",
  TOLL: "Toll",
  PARKING: "Parking",
  INSURANCE: "Insurance",
  REGISTRATION: "Registration",
  MISC: "Miscellaneous",
};

interface Props {
  searchParams: Promise<{
    from?: string;
    to?: string;
    category?: string;
    page?: string;
  }>;
}

export default async function ExpensesPage({ searchParams }: Props) {
  await requirePermission(PERMISSIONS.EXPENSE_VIEW);

  const params = await searchParams;
  const now = new Date();
  const defaultTo = new Date(now);
  const defaultFrom = new Date(now);
  defaultFrom.setDate(defaultFrom.getDate() - 30);

  const from = params.from ? new Date(params.from) : defaultFrom;
  const to = params.to ? new Date(params.to) : defaultTo;
  to.setHours(23, 59, 59, 999);

  const page = Number(params.page ?? 1);
  const category = params.category || undefined;

  const { rows, total } = await listExpenses({ from, to, category, page, pageSize: 30 });

  const fromStr = from.toISOString().slice(0, 10);
  const toStr = defaultTo.toISOString().slice(0, 10);

  const totalSpend = rows.reduce((sum, r) => sum + Number(r.amount), 0);

  const spendByCategory: Record<string, number> = {};
  for (const row of rows) {
    spendByCategory[row.category] = (spendByCategory[row.category] ?? 0) + Number(row.amount);
  }

  const dtFmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div>
      <PageBreadcrumb pageTitle="Expenses" />
      <div className="space-y-6">
        <DateRangeFilterBar
          fields={[
            { id: "exp-from", name: "from", label: "From", type: "date", defaultValue: fromStr },
            { id: "exp-to", name: "to", label: "To", type: "date", defaultValue: toStr },
            {
              id: "exp-category",
              name: "category",
              label: "Category",
              type: "select",
              defaultValue: category ?? "",
              options: [
                { value: "", label: "All categories" },
                ...EXPENSE_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] ?? c })),
              ],
            },
          ]}
        />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard
            label="Total Spend"
            value={`₹${totalSpend.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
            tone="error"
          />
          <StatCard label="Records" value={total.toString()} tone="info" />
          <StatCard
            label="Avg per Record"
            value={
              total > 0
                ? `₹${(totalSpend / total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                : "—"
            }
            tone="default"
          />
        </div>

        {Object.keys(spendByCategory).length > 0 && (
          <ComponentCard title="Spend by Category" desc="Breakdown for the selected period">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(spendByCategory).map(([cat, amount]) => (
                <div key={cat} className="rounded-xl border border-default bg-surface-inset p-3">
                  <p className="text-xs text-muted">{CATEGORY_LABELS[cat] ?? cat}</p>
                  <p className="mt-1 text-base font-semibold text-default">
                    ₹{amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>
          </ComponentCard>
        )}

        <ComponentCard title="Record Expense" desc="Log a new operational expense">
          <ExpenseForm />
        </ComponentCard>

        <ComponentCard
          title="Expense Log"
          desc={`${total} record${total !== 1 ? "s" : ""} in this period`}
        >
          {rows.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-muted">
              <p className="text-sm">No expenses recorded in this period.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-default">
                    <th className="py-3 pr-4 font-medium text-muted">Date</th>
                    <th className="py-3 pr-4 font-medium text-muted">Category</th>
                    <th className="py-3 pr-4 font-medium text-muted">Amount</th>
                    <th className="py-3 pr-4 font-medium text-muted">Vehicle</th>
                    <th className="py-3 pr-4 font-medium text-muted">Staff</th>
                    <th className="py-3 font-medium text-muted">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-default last:border-0">
                      <td className="py-3 pr-4 text-default">
                        {dtFmt.format(new Date(row.at))}
                      </td>
                      <td className="py-3 pr-4 text-default">
                        {CATEGORY_LABELS[row.category] ?? row.category}
                      </td>
                      <td className="py-3 pr-4 font-medium text-on-error-subtle">
                        ₹{Number(row.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 pr-4 text-muted">
                        {row.vehicle
                          ? `${row.vehicle.make} ${row.vehicle.model} (${row.vehicle.registrationNumber})`
                          : "—"}
                      </td>
                      <td className="py-3 pr-4 text-muted">
                        {row.profile?.fullName ?? row.profile?.email ?? "—"}
                      </td>
                      <td className="max-w-xs truncate py-3 text-muted">
                        {row.notes ?? "—"}
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
