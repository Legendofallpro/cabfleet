"use client";

import React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { formatMoney } from "@/lib/format/money";
import { useRequiredInstallSettings } from "@/modules/install/components/InstallSettingsProvider";

function ChevronRightIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  );
}

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
  const settings = useRequiredInstallSettings();
  return (
    <SurfaceCard padding="md" title="Recent Trips">
      {trips.length === 0 ? (
        <p className="text-sm text-muted">No completed trips yet.</p>
      ) : (
        <>
          <ul className="divide-y divide-default">
            {trips.map((trip) => (
              <li key={trip.id}>
                <Link
                  href={`/driver/trips/${trip.id}`}
                  className="flex items-center gap-2 py-4 transition hover:opacity-80"
                >
                  <div className="min-w-0 flex-1">
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
                      {formatMoney(Number(trip.fareFinal), {
                        locale: settings.locale,
                        currency: settings.currency,
                      })}
                    </p>
                  )}
                  <ChevronRightIcon />
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 border-t border-default pt-3">
            <Link
              href="/driver/trips/my"
              className="text-xs font-medium text-primary hover:underline"
            >
              View all trips →
            </Link>
          </div>
        </>
      )}
    </SurfaceCard>
  );
}
