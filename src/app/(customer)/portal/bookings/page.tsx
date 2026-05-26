import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { getRoleHome } from "@/lib/auth/redirects";
import { getOrCreateCustomer, listCustomerBookings } from "@/modules/customers/queries/customer";
import { StatusBadge } from "@/components/common/StatusBadge";
import { BOOKING_STATUS_LABEL } from "@/modules/bookings/booking.constants";
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Bookings</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {total === 0 ? "No bookings yet." : `${total} booking${total !== 1 ? "s" : ""} total`}
          </p>
        </div>
        <Link
          href="/portal/book"
          className="inline-flex h-10 items-center rounded-xl bg-brand-500 px-5 text-sm font-semibold text-white hover:bg-brand-600"
        >
          + New Booking
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-16 text-center dark:border-gray-700 dark:bg-white/[0.02]">
          <p className="text-3xl">🚕</p>
          <h2 className="mt-3 text-base font-semibold text-gray-700 dark:text-white/80">
            No rides yet
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Book your first ride and it will show up here.
          </p>
          <Link
            href="/portal/book"
            className="mt-5 inline-flex h-10 items-center rounded-xl bg-brand-500 px-6 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Book a Ride
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((booking) => (
            <div
              key={booking.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
            >
              {/* Header row */}
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/portal/bookings/${booking.id}`}
                    className="font-mono text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
                  >
                    #{booking.id.slice(-8).toUpperCase()}
                  </Link>
                  <StatusBadge tone={STATUS_TONE[booking.status as BookingStatus]}>
                    {BOOKING_STATUS_LABEL[booking.status as BookingStatus]}
                  </StatusBadge>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {dtFmt.format(new Date(booking.pickupAt))}
                </span>
              </div>

              {/* Route */}
              <div className="space-y-1.5">
                <div className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-green-500" />
                  <span className="text-gray-700 dark:text-white/80">{booking.pickupAddress}</span>
                </div>
                <div className="ml-1 border-l-2 border-dashed border-gray-200 py-0.5 dark:border-gray-700" />
                <div className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                  <span className="text-gray-700 dark:text-white/80">{booking.dropAddress}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3 dark:border-gray-800">
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
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
                    <span className="font-medium text-gray-700 dark:text-white/70">
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
