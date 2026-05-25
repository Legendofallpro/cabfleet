import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { getOrCreateCustomer, listCustomerBookings } from "@/modules/customers/queries/customer";
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

  if (session.profile.role !== "CUSTOMER") redirect("/portal");

  const customer = await getOrCreateCustomer(session.profile.id);
  const { rows: recentBookings } = await listCustomerBookings(customer.id, { pageSize: 3 });

  const firstName = session.profile.fullName?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-8">
      {/* Welcome hero */}
      <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 px-6 py-8 text-white sm:px-8">
        <p className="text-sm font-medium text-brand-100">Welcome back</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
          Hi, {firstName}! 👋
        </h1>
        <p className="mt-2 text-brand-100">
          {customer.totalBookings === 0
            ? "Ready for your first ride?"
            : `You've taken ${customer.totalBookings} ride${customer.totalBookings !== 1 ? "s" : ""} with us.`}
        </p>
        <Link
          href="/portal/book"
          className="mt-5 inline-flex h-11 items-center rounded-xl bg-white px-6 text-sm font-semibold text-brand-700 hover:bg-brand-50 transition-colors"
        >
          🚕 Book a Ride
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total rides</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {customer.totalBookings}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs text-gray-500 dark:text-gray-400">Loyalty tier</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {customer.loyaltyTier ?? "Standard"}
          </p>
        </div>
        <div className="col-span-2 rounded-2xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-white/[0.03] sm:col-span-1">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total spend</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
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
          <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
            Recent rides
          </h2>
          <Link
            href="/portal/bookings"
            className="text-sm text-brand-600 hover:underline dark:text-brand-400"
          >
            View all →
          </Link>
        </div>

        {recentBookings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center dark:border-gray-700 dark:bg-white/[0.02]">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No rides yet.{" "}
              <Link href="/portal/book" className="text-brand-600 hover:underline dark:text-brand-400">
                Book your first one →
              </Link>
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentBookings.map((booking) => (
              <div
                key={booking.id}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <StatusBadge tone={STATUS_TONE[booking.status as BookingStatus]}>
                        {BOOKING_STATUS_LABEL[booking.status as BookingStatus]}
                      </StatusBadge>
                      <span className="truncate text-sm text-gray-700 dark:text-white/80">
                        {booking.pickupAddress}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
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
