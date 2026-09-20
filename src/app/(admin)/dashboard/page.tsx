import type { Metadata } from "next";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { StatCard } from "@/components/common/StatCard";
import {
 getTodayBookingCount,
 getActiveRidesCount,
 getAvailableVehicleCount,
 getTodayRevenue,
 getActiveDriverCount,
 getPendingPaymentCount,
} from "@/modules/reports/queries/dashboard";
import { getDeskQueue } from "@/modules/bookings/queries/desk-queue";
import { DeskQueue } from "@/modules/bookings/components/DeskQueue";
import { DashboardAutoRefresh } from "./DashboardAutoRefresh";
import { formatMoney } from "@/lib/format/money";
import { requireInstallSettings } from "@/modules/install/queries/install";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
 title: "Dashboard | CabFleet Admin",
 description: "CabFleet management platform overview",
};

const quickLinks = [
 { label: "New Booking", href: "/bookings/new", description: "Create a manual booking" },
 { label: "Add Vehicle", href: "/vehicles/new", description: "Register a new fleet vehicle" },
 { label: "Add Driver", href: "/drivers/new", description: "Onboard a new driver" },
 { label: "View Reports", href: "/reports", description: "Fleet analytics and insights" },
];

export default async function DashboardPage() {
 const settings = await requireInstallSettings();
 const [
  todayBookings,
  activeRides,
  availableVehicles,
  todayRevenue,
  activeDrivers,
  pendingPayments,
  deskQueue,
 ] = await Promise.all([
  getTodayBookingCount(),
  getActiveRidesCount(),
  getAvailableVehicleCount(),
  getTodayRevenue(),
  getActiveDriverCount(),
  getPendingPaymentCount(),
  getDeskQueue(),
 ]);

 return (
  <div>
   <DashboardAutoRefresh />
   <PageBreadcrumb pageTitle="Dashboard" />
   <div className="space-y-6">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
     <StatCard label="Bookings Today" value={todayBookings.toString()} tone="info" />
     <StatCard label="Active Rides" value={activeRides.toString()} tone="success" />
     <StatCard label="Available Vehicles" value={availableVehicles.toString()} tone="warning" />
     <StatCard
      label="Revenue Today"
      value={formatMoney(todayRevenue, { locale: settings.locale, currency: settings.currency })}
      tone="success"
     />
     <StatCard label="Active Drivers" value={activeDrivers.toString()} tone="info" />
     <StatCard label="Pending Payments" value={pendingPayments.toString()} tone="error" />
    </div>

    <DeskQueue
     needsAssign={deskQueue.needsAssign}
     openForClaim={deskQueue.openForClaim}
     active={deskQueue.active}
     unpaidCompleted={deskQueue.unpaidCompleted}
    />

    <div className="grid grid-cols-12 gap-6">
     <div className="col-span-12 xl:col-span-8">
      <SurfaceCard title="Quick book">
       <p className="mb-4 text-sm text-muted">
        Phone-first desk: new booking, then assign from the queues above.
       </p>
       <Link
        href="/bookings/new"
        className="inline-flex h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
       >
        New booking
       </Link>
      </SurfaceCard>
     </div>

     <div className="col-span-12 xl:col-span-4">
      <SurfaceCard title="Quick Actions">
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
      </SurfaceCard>
     </div>
    </div>
   </div>
  </div>
 );
}
