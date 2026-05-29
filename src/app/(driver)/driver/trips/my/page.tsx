import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listMyTrips } from "@/modules/bookings/queries/driver";
import { BOOKING_STATUS_LABEL } from "@/modules/bookings/booking.constants";
import type { BookingStatus } from "@prisma/client";

export const metadata: Metadata = { title: "My Trips | CabFleet Driver" };

const statusColor: Record<BookingStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  OPEN_FOR_CLAIM: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  CLAIMED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  ASSIGNED: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  DRIVER_EN_ROUTE: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  IN_PROGRESS: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  CANCELLED: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  NO_SHOW: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  FAILED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default async function MyTripsPage() {
  const session = await getSessionUser();
  if (!session) redirect("/signin");

  const driver = await db.driver.findFirst({
    where: { profileId: session.profile.id, deletedAt: null },
    select: { id: true },
  });
  if (!driver) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-sm text-gray-500">No driver profile found for your account.</p>
      </div>
    );
  }

  const bookings = await listMyTrips(driver.id);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">My Trips</h2>

      {bookings.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You have no trips yet. Claim an open trip to get started.
          </p>
        </div>
      ) : (
        bookings.map((booking) => (
          <Link
            key={booking.id}
            href={`/driver/trips/${booking.id}`}
            className="block rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-brand-300 dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <div className="mb-2 flex items-center justify-between">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor[booking.status as BookingStatus]}`}
              >
                {BOOKING_STATUS_LABEL[booking.status as BookingStatus]}
              </span>
              <span className="text-xs text-gray-400">
                {format(new Date(booking.pickupAt), "dd MMM, h:mm a")}
              </span>
            </div>
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
              {booking.pickupAddress}
            </p>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              → {booking.dropAddress}
            </p>
          </Link>
        ))
      )}
    </div>
  );
}
