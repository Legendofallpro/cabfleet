"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
      ? "bg-error-500 text-white hover:bg-error-600"
      : tripAction.variant === "secondary"
        ? "bg-surface-inset text-default hover:bg-surface-elevated border border-default"
        : "bg-primary hover:bg-primary-hover text-primary-foreground";

  function handleAction() {
    startTransition(async () => {
      const result = await driverTransitionAction({
        bookingId,
        toStatus: tripAction.toStatus,
      });
      if (!result.ok) {
        toast.error(result.error.message);
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
