"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { cancelOwnBookingAction } from "@/modules/bookings/actions/customer-booking.actions";

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
 const [phase, setPhase] = useState<null | "confirming">(null);
 const [pending, startTransition] = useTransition();

 const handleCancel = () => {
  if (phase === "confirming") {
   setPhase(null);
   startTransition(async () => {
    const result = await cancelOwnBookingAction({ bookingId });
    if (!result.ok) {
     toast.error(result.error.message);
     return;
    }
    toast.success("Booking cancelled.");
   });
  } else {
   setPhase("confirming");
   setTimeout(() => setPhase(null), 3000);
  }
 };

 return (
  <button
   type="button"
   onClick={handleCancel}
   disabled={pending}
   className="text-xs font-medium text-error hover:underline disabled:opacity-50"
  >
   {pending ? "Cancelling…" : phase === "confirming" ? "Tap again to confirm" : "Cancel"}
  </button>
 );
}
