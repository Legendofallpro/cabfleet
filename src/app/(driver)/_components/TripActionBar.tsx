"use client";

import { ClaimButton } from "@/app/(driver)/_components/ClaimButton";
import { TripActionButton } from "@/app/(driver)/_components/TripActionButton";
import type { DriverNextAction } from "@/modules/bookings/booking.constants";

function mapsDirUrl(destination: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

export function TripActionBar({
  bookingId,
  customerPhone,
  navigateAddress,
  isOpenForClaim,
  isMyTrip,
  nextActions,
}: {
  bookingId: string;
  customerPhone: string | null;
  navigateAddress: string;
  isOpenForClaim: boolean;
  isMyTrip: boolean;
  nextActions: DriverNextAction[];
}) {
  const primary = nextActions.find((a) => a.variant !== "danger") ?? nextActions[0];
  const danger = nextActions.filter((a) => a.variant === "danger");

  return (
    <div className="fixed bottom-16 left-0 right-0 z-50 border-t border-default bg-surface-elevated p-3 md:bottom-16">
      <div className="mx-auto flex max-w-4xl flex-col gap-2">
        {isMyTrip ? (
          <div className="grid grid-cols-2 gap-2">
            {customerPhone ? (
              <a
                href={`tel:${customerPhone}`}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-default text-sm font-semibold text-default hover:bg-surface-inset"
              >
                Call
              </a>
            ) : (
              <span />
            )}
            <a
              href={mapsDirUrl(navigateAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-default text-sm font-semibold text-default hover:bg-surface-inset"
            >
              Navigate
            </a>
          </div>
        ) : isOpenForClaim ? (
          <a
            href={mapsDirUrl(navigateAddress)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-default text-sm font-semibold text-default hover:bg-surface-inset"
          >
            Navigate
          </a>
        ) : null}

        {isOpenForClaim && <ClaimButton bookingId={bookingId} />}

        {isMyTrip && primary && (
          <TripActionButton bookingId={bookingId} action={primary} />
        )}

        {isMyTrip &&
          danger.map((act) => (
            <TripActionButton key={act.toStatus} bookingId={bookingId} action={act} />
          ))}
      </div>
    </div>
  );
}
