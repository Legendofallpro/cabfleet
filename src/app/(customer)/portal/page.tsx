import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { getRoleHome } from "@/lib/auth/redirects";
import { getOrCreateCustomer } from "@/modules/customers/services/customer.service";
import { listCustomerBookings } from "@/modules/customers/queries/customer";
import { StatusBadge } from "@/components/common/StatusBadge";
import { BOOKING_STATUS_LABEL } from "@/modules/bookings/booking.constants";
import type { BookingStatus } from "@prisma/client";

const dtFmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" });

type StatusTone = "success" | "warning" | "error" | "neutral" | "info";

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

export default async function CustomerPortalPage() {
 const session = await getSessionUser();
 if (!session) redirect("/signin?redirectTo=/portal");

 if (session.profile.role !== "CUSTOMER") redirect(getRoleHome(session.profile.role));

 const customer = await getOrCreateCustomer(session.profile.id);
 const { rows: recentBookings } = await listCustomerBookings(customer.id, { pageSize: 3 });

 const firstName = session.profile.fullName?.split(" ")[0] ?? "there";

 return (
  <div className="space-y-8">
   {/* Welcome hero */}
   <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 px-6 py-8 text-white sm:px-8">
    <p className="text-sm font-medium text-on-primary">Welcome back</p>
    <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
     Hi, {firstName}! 👋
    </h1>
    <p className="mt-2 text-on-primary">
     {customer.totalBookings === 0
      ? "Ready for your first ride?"
      : `You've taken ${customer.totalBookings} ride${customer.totalBookings !== 1 ? "s" : ""} with us.`}
    </p>
    <Link
     href="/portal/book"
     className="mt-5 inline-flex h-11 items-center rounded-xl bg-surface-elevated px-6 text-sm font-semibold text-primary hover:bg-primary-subtle transition-colors"
    >
     🚕 Book a Ride
    </Link>
   </div>

   {/* Stats row */}
   <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
    <div className="rounded-2xl border border-default bg-surface-elevated px-5 py-4">
     <p className="text-xs text-muted">Total rides</p>
     <p className="mt-1 text-2xl font-bold text-default">
      {customer.totalBookings}
     </p>
    </div>
    <div className="rounded-2xl border border-default bg-surface-elevated px-5 py-4">
     <p className="text-xs text-muted">Loyalty tier</p>
     <p className="mt-1 text-2xl font-bold text-default">
      {customer.loyaltyTier ?? "Standard"}
     </p>
    </div>
    <div className="col-span-2 rounded-2xl border border-default bg-surface-elevated px-5 py-4 sm:col-span-1">
     <p className="text-xs text-muted">Total spend</p>
     <p className="mt-1 text-2xl font-bold text-default">
      {new Intl.NumberFormat("en-IN", {
       style: "currency",
       currency: "INR",
       maximumFractionDigits: 0,
      }).format(customer.totalSpend)}
     </p>
    </div>
   </div>

   {/* Recent bookings */}
   <div>
    <div className="mb-3 flex items-center justify-between">
     <h2 className="text-base font-semibold text-default">
      Recent rides
     </h2>
     <Link
      href="/portal/bookings"
      className="text-sm text-primary hover:underline"
     >
      View all →
     </Link>
    </div>

    {recentBookings.length === 0 ? (
     <div className="rounded-2xl border border-dashed border-default bg-surface-inset px-6 py-10 text-center ">
      <p className="text-sm text-muted">
       No rides yet.{" "}
       <Link href="/portal/book" className="text-primary hover:underline">
        Book your first one →
       </Link>
      </p>
     </div>
    ) : (
     <div className="space-y-3">
      {recentBookings.map((booking) => (
       <div
        key={booking.id}
        className="rounded-xl border border-default bg-surface-elevated px-4 py-3 "
       >
        <div className="flex items-center justify-between gap-2">
         <div className="min-w-0">
          <div className="flex items-center gap-2">
           <StatusBadge tone={STATUS_TONE[booking.status as BookingStatus]}>
            {BOOKING_STATUS_LABEL[booking.status as BookingStatus]}
           </StatusBadge>
           <span className="truncate text-sm text-default">
            {booking.pickupAddress}
           </span>
          </div>
          <p className="mt-0.5 text-xs text-muted">
           {booking.bookingType.name} · {dtFmt.format(new Date(booking.pickupAt))}
          </p>
         </div>
        </div>
       </div>
      ))}
     </div>
    )}
   </div>
  </div>
 );
}
