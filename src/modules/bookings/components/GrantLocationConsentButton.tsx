"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { grantLocationConsentAction } from "@/modules/bookings/actions/customer-booking.actions";

export function GrantLocationConsentButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onGrant() {
    setBusy(true);
    try {
      const result = await grantLocationConsentAction({ bookingId });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Live location sharing is on for this trip.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-default bg-surface-elevated p-4">
      <p className="text-sm font-medium text-default">Share live location</p>
      <p className="mt-1 text-xs text-muted">
        Lets you see your driver on a map. Points are kept for 30 days, then deleted.
      </p>
      <button
        type="button"
        onClick={onGrant}
        disabled={busy}
        className="mt-4 h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
      >
        {busy ? "Saving…" : "Share my live location"}
      </button>
    </div>
  );
}
