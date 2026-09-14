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

  if (tripAction.variant === "danger") {
    return (
      <button
        type="button"
        onClick={handleAction}
        disabled={isPending}
        className="h-11 w-full text-sm font-medium text-error hover:underline disabled:opacity-60"
      >
        {isPending ? "Updating…" : tripAction.label}
      </button>
    );
  }

  const variantClass =
    tripAction.variant === "secondary"
      ? "border border-default bg-surface-inset text-default hover:bg-surface-elevated"
      : "bg-primary text-primary-foreground hover:bg-primary-hover";

  return (
    <button
      type="button"
      onClick={handleAction}
      disabled={isPending}
      className={`h-12 w-full rounded-xl px-4 text-base font-semibold shadow-sm transition active:scale-95 disabled:opacity-60 ${variantClass}`}
    >
      {isPending ? "Updating…" : tripAction.label}
    </button>
  );
}
