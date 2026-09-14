import Link from "next/link";
import { redirect } from "next/navigation";
import type { BookingStatus } from "@prisma/client";

import { getSessionUser } from "@/lib/auth/session";
import { getRoleHome } from "@/lib/auth/redirects";
import { getOrCreateCustomer } from "@/modules/customers/services/customer.service";
import {
  getActiveCustomerBooking,
  listCustomerBookings,
} from "@/modules/customers/queries/customer";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  CUSTOMER_STATUS_LABEL,
  BOOKING_STATUS_TONE,
} from "@/modules/bookings/booking.constants";

const dtFmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" });
const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export default async function CustomerPortalPage() {
  const session = await getSessionUser();
  if (!session) redirect("/signin?redirectTo=/portal");
  if (session.profile.role !== "CUSTOMER") redirect(getRoleHome(session.profile.role));

  const customer = await getOrCreateCustomer(session.profile.id);
  const [activeTrip, { rows: recentBookings }] = await Promise.all([
    getActiveCustomerBooking(customer.id),
    listCustomerBookings(customer.id, { pageSize: 3 }),
  ]);

  const firstName = session.profile.fullName?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-8">
      {activeTrip ? (
        <Link
          href={`/portal/bookings/${activeTrip.id}`}
          className="block rounded-2xl border-2 border-primary bg-primary-subtle p-5"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-on-primary-subtle">
            Your trip
          </p>
          <div className="mt-2">
            <StatusBadge tone={BOOKING_STATUS_TONE[activeTrip.status]}>
              {CUSTOMER_STATUS_LABEL[activeTrip.status]}
            </StatusBadge>
          </div>
          <p className="mt-3 text-sm font-medium text-default">{activeTrip.pickupAddress}</p>
          <p className="mt-0.5 text-sm text-muted">→ {activeTrip.dropAddress}</p>
          <div className="mt-3 flex items-center justify-between text-xs text-muted">
            <span>{dtFmt.format(new Date(activeTrip.pickupAt))}</span>
            <span className="font-medium text-primary">View trip</span>
          </div>
        </Link>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted">Hi, {firstName}</p>
            <h1 className="mt-1 text-2xl font-bold text-default">Where to?</h1>
          </div>
          <Link
            href="/portal/book"
            className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            Book a ride
          </Link>
        </div>
      )}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-default">Recent trips</h2>
          <Link href="/portal/bookings" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>

        {recentBookings.length === 0 ? (
          <p className="text-sm text-muted">No trips yet.</p>
        ) : (
          <div className="space-y-2">
            {recentBookings.map((booking) => {
              const status = booking.status as BookingStatus;
              const fare = booking.fareFinal ?? booking.fareEstimate;
              return (
                <Link
                  key={booking.id}
                  href={`/portal/bookings/${booking.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-default bg-surface-elevated px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-default">{booking.pickupAddress}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {booking.bookingType.name} · {dtFmt.format(new Date(booking.pickupAt))}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <StatusBadge tone={BOOKING_STATUS_TONE[status]}>
                      {CUSTOMER_STATUS_LABEL[status]}
                    </StatusBadge>
                    {fare != null && (
                      <p className="mt-1 text-xs text-muted">{currency.format(fare)}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
