import React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { StatusBadge } from "@/components/common/StatusBadge";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_TONE } from "@/modules/bookings/booking.constants";
import type { BookingStatus } from "@prisma/client";

interface ActiveTrip {
  id: string;
  status: string;
  pickupAddress: string;
  dropAddress: string;
  pickupAt: Date;
  fareEstimate: unknown;
  fareFinal: unknown;
  bookingType: { name: string };
}

interface ActiveTripBannerProps {
  trip: ActiveTrip;
}

export function ActiveTripBanner({ trip }: ActiveTripBannerProps) {
  const status = trip.status as BookingStatus;
  return (
    <Link
      href={`/driver/trips/${trip.id}`}
      className="block rounded-2xl border-2 border-primary bg-primary-subtle p-4 transition hover:opacity-90"
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-on-primary-subtle">
          Active Trip
        </p>
        <StatusBadge tone={BOOKING_STATUS_TONE[status]}>
          {BOOKING_STATUS_LABEL[status]}
        </StatusBadge>
      </div>
      <p className="text-sm font-medium text-default">{trip.pickupAddress}</p>
      <p className="mt-0.5 text-sm text-muted">→ {trip.dropAddress}</p>
      <div className="mt-2 flex items-center justify-between text-xs text-muted">
        <span>{format(new Date(trip.pickupAt), "dd MMM, h:mm a")}</span>
        <span className="font-medium text-primary">View trip →</span>
      </div>
    </Link>
  );
}
