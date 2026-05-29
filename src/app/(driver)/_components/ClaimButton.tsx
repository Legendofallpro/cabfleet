"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { claimBookingAction } from "@/modules/bookings/actions/driver-booking.actions";

export function ClaimButton({ bookingId }: { bookingId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClaim() {
    startTransition(async () => {
      const result = await claimBookingAction({ bookingId });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      router.push(`/driver/trips/${bookingId}`);
    });
  }

  return (
    <button
      onClick={handleClaim}
      disabled={isPending}
      className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary-hover active:scale-95 disabled:opacity-60"
    >
      {isPending ? "Claiming…" : "Claim Trip"}
    </button>
  );
}
