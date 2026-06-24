import React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { SurfaceCard } from "@/components/common/SurfaceCard";

interface RecentTrip {
  id: string;
  pickupAddress: string;
  dropAddress: string;
  pickupAt: Date;
  fareFinal: unknown;
}

interface RecentTripsListProps {
  trips: RecentTrip[];
}

export function RecentTripsList({ trips }: RecentTripsListProps) {
  return (
    <SurfaceCard padding="sm" title="Recent Trips">
      {trips.length === 0 ? (
        <p className="text-sm text-muted">No completed trips yet.</p>
      ) : (
        <ul className="divide-y divide-default">
          {trips.map((trip) => (
            <li key={trip.id}>
              <Link
                href={`/driver/trips/${trip.id}`}
                className="flex items-center justify-between py-3 hover:opacity-80 transition"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <p className="truncate text-sm font-medium text-default">
                    {trip.pickupAddress}
                  </p>
                  <p className="truncate text-xs text-muted">→ {trip.dropAddress}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {format(new Date(trip.pickupAt), "dd MMM, h:mm a")}
                  </p>
                </div>
                {trip.fareFinal != null && (
                  <p className="shrink-0 text-sm font-semibold text-default">
                    ₹{Number(trip.fareFinal).toFixed(0)}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SurfaceCard>
  );
}
