import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { getRoleHome } from "@/lib/auth/redirects";
import { getOrCreateCustomer } from "@/modules/customers/services/customer.service";
import { listCustomerBookings } from "@/modules/customers/queries/customer";
import { StatusBadge } from "@/components/common/StatusBadge";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_TONE } from "@/modules/bookings/booking.constants";
import { CancelBookingButton } from "@/modules/bookings/components/CancelBookingButton";
import type { BookingStatus } from "@prisma/client";

const CANCELLABLE_STATUSES = new Set<BookingStatus>(["PENDING", "OPEN_FOR_CLAIM"]);

export const metadata: Metadata = { title: "My Bookings | CabFleet" };

const dtFmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" });
const currency = new Intl.NumberFormat("en-IN", {
 style: "currency",
 currency: "INR",
 maximumFractionDigits: 0,
});

export default async function MyBookingsPage() {
 const session = await getSessionUser();
 if (!session) redirect("/signin?redirectTo=/portal/bookings");

 if (session.profile.role !== "CUSTOMER") redirect(getRoleHome(session.profile.role));

 const customer = await getOrCreateCustomer(session.profile.id);
 const { rows, total } = await listCustomerBookings(customer.id, { pageSize: 50 });

 return (
  <div>
   <div className="mb-6 flex items-center justify-between">
    <div>
     <h1 className="text-2xl font-bold text-default">My Bookings</h1>
     <p className="mt-1 text-sm text-muted">
      {total === 0 ? "No bookings yet." : `${total} booking${total !== 1 ? "s" : ""} total`}
     </p>
    </div>
    <Link
     href="/portal/book"
     className="inline-flex h-10 items-center rounded-xl bg-primary-subtle0 px-5 text-sm font-semibold text-white hover:bg-primary-hover"
    >
     + New Booking
    </Link>
   </div>

   {rows.length === 0 ? (
    <div className="rounded-2xl border border-dashed border-default bg-surface-inset px-6 py-16 text-center ">
     <p className="text-3xl">🚕</p>
     <h2 className="mt-3 text-base font-semibold text-default">
      No rides yet
     </h2>
     <p className="mt-1 text-sm text-muted">
      Book your first ride and it will show up here.
     </p>
     <Link
      href="/portal/book"
      className="mt-5 inline-flex h-10 items-center rounded-xl bg-primary-subtle0 px-6 text-sm font-semibold text-white hover:bg-primary-hover"
     >
      Book a Ride
     </Link>
    </div>
   ) : (
    <div className="space-y-3">
     {rows.map((booking) => (
      <div
       key={booking.id}
       className="rounded-2xl border border-default bg-surface-elevated p-5"
      >
       {/* Header row */}
       <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
         <Link
          href={`/portal/bookings/${booking.id}`}
          className="font-mono text-xs font-medium text-primary hover:underline"
         >
          #{booking.id.slice(-8).toUpperCase()}
         </Link>
         <StatusBadge tone={BOOKING_STATUS_TONE[booking.status as BookingStatus]}>
          {BOOKING_STATUS_LABEL[booking.status as BookingStatus]}
         </StatusBadge>
        </div>
        <span className="text-xs text-muted">
         {dtFmt.format(new Date(booking.pickupAt))}
        </span>
       </div>

       {/* Route */}
       <div className="space-y-1.5">
        <div className="flex items-start gap-2 text-sm">
         <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-green-500" />
         <span className="text-default">{booking.pickupAddress}</span>
        </div>
        <div className="ml-1 border-l-2 border-dashed border-default py-0.5 " />
        <div className="flex items-start gap-2 text-sm">
         <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />
         <span className="text-default">{booking.dropAddress}</span>
        </div>
       </div>

       {/* Footer */}
       <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-default pt-3 ">
       <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
        <span>{booking.bookingType.name}</span>
        <span>·</span>
        <span>{booking.passengers} passenger{booking.passengers !== 1 ? "s" : ""}</span>
        {booking.fareEstimate != null && (
         <>
          <span>·</span>
          <span>Est. {currency.format(booking.fareEstimate)}</span>
         </>
        )}
        {booking.fareFinal != null && (
         <>
          <span>·</span>
          <span className="font-medium text-default /70">
           Final {currency.format(booking.fareFinal)}
          </span>
         </>
        )}
       </div>
       {CANCELLABLE_STATUSES.has(booking.status as BookingStatus) && (
        <CancelBookingButton bookingId={booking.id} />
       )}
       </div>
      </div>
     ))}
    </div>
   )}
  </div>
 );
}
