import { Metadata } from "next";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import {
  revenueByPeriod,
  tripsByStatus,
  driverUtilization,
  vehicleUtilization,
  topCustomersBySpend,
  type ReportPeriod,
} from "@/modules/reports/queries/report";

export const metadata: Metadata = {
  title: "Reports | CabFleet Admin",
  description: "Fleet analytics and operational reports",
};

const BOOKING_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  OPEN_FOR_CLAIM: "Open for Claim",
  CLAIMED: "Claimed",
  ASSIGNED: "Assigned",
  DRIVER_EN_ROUTE: "Driver En Route",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  FAILED: "Failed",
  NO_SHOW: "No Show",
};

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: "bg-success-100 text-success-700",
  CANCELLED: "bg-error-100 text-error-700",
  IN_PROGRESS: "bg-brand-100 text-brand-700",
  ASSIGNED: "bg-warning-100 text-warning-700",
  PENDING: "bg-gray-100 text-gray-600",
  FAILED: "bg-error-100 text-error-700",
  NO_SHOW: "bg-gray-100 text-gray-500",
};

interface Props {
  searchParams: Promise<{
    period?: string;
    from?: string;
    to?: string;
  }>;
}

export default async function ReportsPage({ searchParams }: Props) {
  const params = await searchParams;
  const period = (params.period as ReportPeriod | undefined) ?? "day";

  const now = new Date();
  const defaultTo = new Date(now);
  const defaultFrom = new Date(now);
  defaultFrom.setDate(defaultFrom.getDate() - 30);

  const from = params.from ? new Date(params.from) : defaultFrom;
  const to = params.to ? new Date(params.to) : defaultTo;
  to.setHours(23, 59, 59, 999);

  const [revenue, tripsStatus, driverUtil, vehicleUtil, topCustomers] =
    await Promise.all([
      revenueByPeriod({ from, to, period }),
      tripsByStatus({ from, to }),
      driverUtilization({ from, to, limit: 10 }),
      vehicleUtilization({ from, to, limit: 10 }),
      topCustomersBySpend({ from, to, limit: 10 }),
    ]);

  const totalRevenue = revenue.reduce((s, r) => s + r.total, 0);
  const totalTrips = tripsStatus.reduce((s, r) => s + r.count, 0);
  const completedTrips = tripsStatus.find((r) => r.status === "COMPLETED")?.count ?? 0;

  const fromStr = from.toISOString().slice(0, 10);
  const toStr = defaultTo.toISOString().slice(0, 10);

  return (
    <div>
      <PageBreadcrumb pageTitle="Reports" />
      <div className="space-y-6">

        {/* Filters */}
        <form method="GET" className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="rpt-from" className="text-xs font-medium text-gray-600 dark:text-gray-400">
              From
            </label>
            <input
              id="rpt-from"
              name="from"
              type="date"
              defaultValue={fromStr}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="rpt-to" className="text-xs font-medium text-gray-600 dark:text-gray-400">
              To
            </label>
            <input
              id="rpt-to"
              name="to"
              type="date"
              defaultValue={toStr}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="rpt-period" className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Group By
            </label>
            <select
              id="rpt-period"
              name="period"
              defaultValue={period}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-brand-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-600"
          >
            Apply
          </button>
        </form>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            {
              label: "Total Revenue",
              value: `₹${totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
              color: "bg-success-50 dark:bg-success-500/10",
            },
            {
              label: "Total Trips",
              value: totalTrips.toString(),
              color: "bg-brand-50 dark:bg-brand-500/10",
            },
            {
              label: "Completed Trips",
              value: completedTrips.toString(),
              color: "bg-warning-50 dark:bg-warning-500/10",
            },
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

        {/* Revenue trend */}
        <ComponentCard title="Revenue Trend" desc={`Captured payments grouped by ${period}`}>
          {revenue.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No payment data in this range.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Period</th>
                    <th className="py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Payments</th>
                    <th className="py-2 font-medium text-gray-500 dark:text-gray-400">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {revenue.map((row) => (
                    <tr key={row.period} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
                      <td className="py-2 pr-4 text-gray-600 dark:text-gray-300">{row.period}</td>
                      <td className="py-2 pr-4 text-gray-800 dark:text-white/80">{row.count}</td>
                      <td className="py-2 font-medium text-success-600 dark:text-success-400">
                        ₹{row.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ComponentCard>

        {/* Two-column row: Trips by status + Top customers */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ComponentCard title="Trips by Status" desc="Booking counts in this period">
            {tripsStatus.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No bookings in this range.</p>
            ) : (
              <ul className="space-y-2">
                {tripsStatus.map((row) => (
                  <li key={row.status} className="flex items-center justify-between">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[row.status] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {BOOKING_STATUS_LABEL[row.status] ?? row.status}
                    </span>
                    <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
                      {row.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </ComponentCard>

          <ComponentCard title="Top Customers by Spend" desc="Highest-paying customers">
            {topCustomers.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No payment data in this range.</p>
            ) : (
              <ol className="space-y-2">
                {topCustomers.map((row, i) => (
                  <li key={row.customerId} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-400">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                        {row.customerName}
                      </p>
                      <p className="text-xs text-gray-500">{row.bookingCount} bookings</p>
                    </div>
                    <span className="text-sm font-semibold text-success-600 dark:text-success-400">
                      ₹{row.totalSpend.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </ComponentCard>
        </div>

        {/* Two-column row: Driver + Vehicle utilisation */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ComponentCard title="Driver Utilisation" desc="Completed trips per driver">
            {driverUtil.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No completed trips in this range.</p>
            ) : (
              <ol className="space-y-2">
                {driverUtil.map((row, i) => (
                  <li key={row.driverId} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-warning-100 text-xs font-bold text-warning-700 dark:bg-warning-500/20 dark:text-warning-400">
                      {i + 1}
                    </span>
                    <p className="flex-1 truncate text-sm font-medium text-gray-800 dark:text-white/90">
                      {row.driverName}
                    </p>
                    <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
                      {row.completedTrips} trips
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </ComponentCard>

          <ComponentCard title="Vehicle Utilisation" desc="Total completed trips per vehicle">
            {vehicleUtil.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No completed trips in this range.</p>
            ) : (
              <ol className="space-y-2">
                {vehicleUtil.map((row, i) => (
                  <li key={row.vehicleId} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      {i + 1}
                    </span>
                    <p className="flex-1 truncate text-sm font-medium text-gray-800 dark:text-white/90">
                      {row.registrationNumber}
                    </p>
                    <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
                      {row.totalTrips} trips
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </ComponentCard>
        </div>
      </div>
    </div>
  );
}
