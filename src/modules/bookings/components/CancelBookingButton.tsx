"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { cancelOwnBookingAction } from "@/modules/bookings/actions/customer-booking.actions";

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const [pending, startTransition] = useTransition();

  const handleCancel = () => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    startTransition(async () => {
      const result = await cancelOwnBookingAction({ bookingId });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Booking cancelled.");
    });
  };

  return (
    <button
      type="button"
      onClick={handleCancel}
      disabled={pending}
      className="text-xs font-medium text-error-600 hover:underline disabled:opacity-50 dark:text-error-400"
    >
      {pending ? "Cancelling…" : "Cancel"}
    </button>
  );
}
