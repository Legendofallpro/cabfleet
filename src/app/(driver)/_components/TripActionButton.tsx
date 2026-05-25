"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BookingStatus } from "@prisma/client";
import { driverTransitionAction } from "@/modules/bookings/actions/driver-booking.actions";

type TripAction = {
  label: string;
  toStatus: BookingStatus;
  variant?: "primary" | "danger" | "secondary";
};

export function TripActionButton({
  bookingId,
  action: tripAction,
}: {
  bookingId: string;
  action: TripAction;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const variantClass =
    tripAction.variant === "danger"
      ? "bg-red-500 hover:bg-red-600"
      : tripAction.variant === "secondary"
        ? "bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
        : "bg-brand-500 hover:bg-brand-600 text-white";

  function handleAction() {
    startTransition(async () => {
      const result = await driverTransitionAction({
        bookingId,
        toStatus: tripAction.toStatus,
      });
      if (!result.ok) {
        alert(result.error.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleAction}
      disabled={isPending}
      className={`w-full rounded-xl px-4 py-3 text-sm font-semibold shadow-sm transition active:scale-95 disabled:opacity-60 ${variantClass}`}
    >
      {isPending ? "Updating…" : tripAction.label}
    </button>
  );
}
