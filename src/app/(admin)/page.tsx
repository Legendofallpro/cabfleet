import type { Metadata } from "next";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge, type StatusTone } from "@/components/common/StatusBadge";
import {
 getTodayBookingCount,
 getActiveRidesCount,
 getAvailableVehicleCount,
 getTodayRevenue,
 getActiveDriverCount,
 getPendingPaymentCount,
 getRecentBookings,
} from "@/modules/reports/queries/dashboard";
import { BOOKING_STATUS_LABEL } from "@/modules/bookings/booking.constants";
import type { BookingStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
 title: "Dashboard | CabFleet Admin",
 description: "CabFleet management platform overview",
};

const STATUS_TONE: Record<BookingStatus, StatusTone> = {
 PENDING: "warning",
 OPEN_FOR_CLAIM: "info",
 CLAIMED: "info",
 ASSIGNED: "info",
 DRIVER_EN_ROUTE: "info",
 IN_PROGRESS: "success",
 COMPLETED: "success",
 CANCELLED: "neutral",
 NO_SHOW: "neutral",
 FAILED: "error",
};

const quickLinks = [
 { label: "New Booking", href: "/bookings/new", description: "Create a manual booking" },
 { label: "Add Vehicle", href: "/vehicles/new", description: "Register a new fleet vehicle" },
 { label: "Add Driver", href: "/drivers/new", description: "Onboard a new driver" },
 { label: "View Reports", href: "/reports", description: "Fleet analytics and insights" },
];

const dtFmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" });

export default async function DashboardPage() {
 const [
  todayBookings,
  activeRides,
  availableVehicles,
  todayRevenue,
  activeDrivers,
  pendingPayments,
  recentBookings,
 ] = await Promise.all([
  getTodayBookingCount(),
  getActiveRidesCount(),
  getAvailableVehicleCount(),
  getTodayRevenue(),
  getActiveDriverCount(),
  getPendingPaymentCount(),
  getRecentBookings(8),
 ]);

 return (
  <div>
   <PageBreadcrumb pageTitle="Dashboard" />
   <div className="space-y-6">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
     <StatCard label="Bookings Today" value={todayBookings.toString()} tone="info" />
     <StatCard label="Active Rides" value={activeRides.toString()} tone="success" />
     <StatCard label="Available Vehicles" value={availableVehicles.toString()} tone="warning" />
     <StatCard
      label="Revenue Today"
      value={`₹${todayRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
      tone="success"
     />
     <StatCard label="Active Drivers" value={activeDrivers.toString()} tone="info" />
     <StatCard label="Pending Payments" value={pendingPayments.toString()} tone="error" />
    </div>

    <div className="grid grid-cols-12 gap-6">
     <div className="col-span-12 xl:col-span-8">
      <ComponentCard
       title="Recent Bookings"
       desc="Latest booking activity across the fleet."
      >
       {recentBookings.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-muted">
         <p className="text-sm">No bookings yet.</p>
        </div>
       ) : (
        <div className="overflow-x-auto">
         <table className="w-full text-left text-sm">
          <thead>
           <tr className="border-b border-default">
            <th className="py-3 pr-4 font-medium text-muted">Customer</th>
            <th className="py-3 pr-4 font-medium text-muted">Pickup</th>
            <th className="py-3 pr-4 font-medium text-muted">Time</th>
            <th className="py-3 font-medium text-muted">Status</th>
           </tr>
          </thead>
          <tbody>
           {recentBookings.map((b) => (
            <tr key={b.id} className="border-b border-default last:border-0">
             <td className="py-3 pr-4">
              <Link
               href={`/bookings/${b.id}`}
               className="font-medium text-primary hover:underline"
              >
               {b.customer?.profile.fullName ?? b.customer?.profile.email ?? "—"}
              </Link>
             </td>
             <td className="max-w-xs truncate py-3 pr-4 text-muted">
              {b.pickupAddress}
             </td>
             <td className="py-3 pr-4 text-muted">
              {b.pickupAt ? dtFmt.format(new Date(b.pickupAt)) : "—"}
             </td>
             <td className="py-3">
              <StatusBadge tone={STATUS_TONE[b.status]}>
               {BOOKING_STATUS_LABEL[b.status]}
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

     <div className="col-span-12 xl:col-span-4">
      <ComponentCard title="Quick Actions">
       <div className="space-y-3">
        {quickLinks.map((link) => (
         <Link
          key={link.label}
          href={link.href}
          className="flex items-start gap-3 rounded-xl border border-default p-3 transition-colors hover:bg-surface-inset"
         >
          <div>
           <p className="text-sm font-medium text-default">{link.label}</p>
           <p className="text-xs text-muted">{link.description}</p>
          </div>
         </Link>
        ))}
       </div>
      </ComponentCard>
     </div>
    </div>
   </div>
  </div>
 );
}
