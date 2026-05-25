import { Metadata } from "next";
import { format } from "date-fns";
import { listOpenForClaimBookings } from "@/modules/bookings/queries/driver";
import { ClaimButton } from "@/app/(driver)/_components/ClaimButton";

export const metadata: Metadata = { title: "Open Trips | CabFleet Driver" };

export default async function OpenTripsPage() {
  const bookings = await listOpenForClaimBookings();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Open Trips</h2>

      {bookings.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No open trips right now. Check back in a moment.
          </p>
        </div>
      ) : (
        bookings.map((booking) => (
          <div
            key={booking.id}
            className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <div className="mb-3 flex items-start justify-between">
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Open for Claim
              </span>
              <span className="text-xs text-gray-400">
                {format(new Date(booking.pickupAt), "dd MMM, h:mm a")}
              </span>
            </div>

            <div className="mb-1 text-sm font-medium text-gray-800 dark:text-white/90">
              {booking.pickupAddress}
            </div>
            <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              → {booking.dropAddress}
            </div>

            <div className="mb-4 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span>{booking.bookingType.name}</span>
              <span>{booking.passengers} pax</span>
              {booking.fareEstimate && (
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  ₹{Number(booking.fareEstimate).toFixed(0)}
                </span>
              )}
            </div>

            <ClaimButton bookingId={booking.id} />
          </div>
        ))
      )}
    </div>
  );
}
