import { Metadata } from "next";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { StatCard } from "@/components/common/StatCard";
import { DateRangeFilterBar } from "@/components/common/DateRangeFilterBar";
import { StatusBadge, type StatusTone } from "@/components/common/StatusBadge";
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

const BOOKING_STATUS_TONE: Record<string, StatusTone> = {
  COMPLETED: "success",
  CANCELLED: "error",
  FAILED: "error",
  IN_PROGRESS: "info",
  ASSIGNED: "warning",
  DRIVER_EN_ROUTE: "warning",
  CLAIMED: "warning",
  PENDING: "neutral",
  OPEN_FOR_CLAIM: "neutral",
  NO_SHOW: "neutral",
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
        <DateRangeFilterBar
          submitLabel="Apply"
          fields={[
            { id: "rpt-from", name: "from", label: "From", type: "date", defaultValue: fromStr },
            { id: "rpt-to",   name: "to",   label: "To",   type: "date", defaultValue: toStr },
            {
              id: "rpt-period", name: "period", label: "Group By", type: "select",
              defaultValue: period,
              options: [
                { value: "day", label: "Day" },
                { value: "week", label: "Week" },
                { value: "month", label: "Month" },
              ],
            },
          ]}
        />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard
            label="Total Revenue"
            value={`₹${totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
            tone="success"
          />
          <StatCard label="Total Trips"     value={totalTrips.toString()}     tone="info" />
          <StatCard label="Completed Trips" value={completedTrips.toString()} tone="warning" />
        </div>

        <ComponentCard title="Revenue Trend" desc={`Captured payments grouped by ${period}`}>
          {revenue.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No payment data in this range.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-default">
                    <th className="py-2 pr-4 font-medium text-muted">Period</th>
                    <th className="py-2 pr-4 font-medium text-muted">Payments</th>
                    <th className="py-2 font-medium text-muted">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {revenue.map((row) => (
                    <tr key={row.period} className="border-b border-default last:border-0">
                      <td className="py-2 pr-4 text-default">{row.period}</td>
                      <td className="py-2 pr-4 text-default">{row.count}</td>
                      <td className="py-2 font-medium text-on-success-subtle">
                        ₹{row.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ComponentCard>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ComponentCard title="Trips by Status" desc="Booking counts in this period">
            {tripsStatus.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">No bookings in this range.</p>
            ) : (
              <ul className="space-y-2">
                {tripsStatus.map((row) => (
                  <li key={row.status} className="flex items-center justify-between">
                    <StatusBadge tone={BOOKING_STATUS_TONE[row.status] ?? "neutral"}>
                      {BOOKING_STATUS_LABEL[row.status] ?? row.status}
                    </StatusBadge>
                    <span className="text-sm font-semibold text-default">{row.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </ComponentCard>

          <ComponentCard title="Top Customers by Spend" desc="Highest-paying customers">
            {topCustomers.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">No payment data in this range.</p>
            ) : (
              <ol className="space-y-2">
                {topCustomers.map((row, i) => (
                  <li key={row.customerId} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-xs font-bold text-on-primary-subtle">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-default">{row.customerName}</p>
                      <p className="text-xs text-muted">{row.bookingCount} bookings</p>
                    </div>
                    <span className="text-sm font-semibold text-on-success-subtle">
                      ₹{row.totalSpend.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </ComponentCard>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ComponentCard title="Driver Utilisation" desc="Completed trips per driver">
            {driverUtil.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">No completed trips in this range.</p>
            ) : (
              <ol className="space-y-2">
                {driverUtil.map((row, i) => (
                  <li key={row.driverId} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-warning-subtle text-xs font-bold text-on-warning-subtle">
                      {i + 1}
                    </span>
                    <p className="flex-1 truncate text-sm font-medium text-default">{row.driverName}</p>
                    <span className="text-sm font-semibold text-default">{row.completedTrips} trips</span>
                  </li>
                ))}
              </ol>
            )}
          </ComponentCard>

          <ComponentCard title="Vehicle Utilisation" desc="Total completed trips per vehicle">
            {vehicleUtil.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">No completed trips in this range.</p>
            ) : (
              <ol className="space-y-2">
                {vehicleUtil.map((row, i) => (
                  <li key={row.vehicleId} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-inset text-xs font-bold text-muted">
                      {i + 1}
                    </span>
                    <p className="flex-1 truncate text-sm font-medium text-default">{row.registrationNumber}</p>
                    <span className="text-sm font-semibold text-default">{row.totalTrips} trips</span>
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
