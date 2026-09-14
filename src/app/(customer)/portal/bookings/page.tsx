import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { BookingStatus } from "@prisma/client";

import { getSessionUser } from "@/lib/auth/session";
import { getRoleHome } from "@/lib/auth/redirects";
import { getOrCreateCustomer } from "@/modules/customers/services/customer.service";
import { listCustomerBookings } from "@/modules/customers/queries/customer";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  CUSTOMER_STATUS_LABEL,
  BOOKING_STATUS_TONE,
  isTerminalStatus,
} from "@/modules/bookings/booking.constants";
import { CancelBookingButton } from "@/modules/bookings/components/CancelBookingButton";

const CANCELLABLE = new Set<BookingStatus>(["PENDING", "OPEN_FOR_CLAIM"]);

export const metadata: Metadata = { title: "My trips | CabFleet" };

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
  const { rows } = await listCustomerBookings(customer.id, { pageSize: 50 });

  const upcoming = rows.filter((b) => !isTerminalStatus(b.status as BookingStatus));
  const past = rows.filter((b) => isTerminalStatus(b.status as BookingStatus));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-default">My trips</h1>
        <p className="mt-1 text-sm text-muted">Upcoming first, then past rides.</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-default">Upcoming</h2>
        {upcoming.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-default bg-surface-inset px-6 py-10 text-center">
            <p className="text-sm text-muted">No upcoming trips.</p>
            <Link
              href="/portal/book"
              className="mt-4 inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
            >
              Book a ride
            </Link>
          </div>
        ) : (
          upcoming.map((booking) => (
            <TripRow key={booking.id} booking={booking} />
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-default">Past</h2>
        {past.length === 0 ? (
          <p className="text-sm text-muted">No past trips yet.</p>
        ) : (
          past.map((booking) => <TripRow key={booking.id} booking={booking} />)
        )}
      </section>
    </div>
  );
}

function TripRow({
  booking,
}: {
  booking: Awaited<ReturnType<typeof listCustomerBookings>>["rows"][number];
}) {
  const status = booking.status as BookingStatus;
  const fare = booking.fareFinal ?? booking.fareEstimate;
  return (
    <div className="rounded-2xl border border-default bg-surface-elevated p-4">
      <Link href={`/portal/bookings/${booking.id}`} className="block">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs text-muted">{dtFmt.format(new Date(booking.pickupAt))}</span>
          <StatusBadge tone={BOOKING_STATUS_TONE[status]}>
            {CUSTOMER_STATUS_LABEL[status]}
          </StatusBadge>
        </div>
        <p className="truncate text-sm text-default">{booking.pickupAddress}</p>
        <p className="mt-0.5 truncate text-sm text-muted">→ {booking.dropAddress}</p>
        {fare != null && (
          <p className="mt-2 text-sm font-medium text-default">{currency.format(fare)}</p>
        )}
      </Link>
      {CANCELLABLE.has(status) && (
        <div className="mt-3 border-t border-default pt-3">
          <CancelBookingButton bookingId={booking.id} />
        </div>
      )}
    </div>
  );
}
