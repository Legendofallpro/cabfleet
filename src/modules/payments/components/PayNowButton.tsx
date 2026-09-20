"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { createCustomerCheckoutAction } from "@/modules/payments/actions/payment.actions";
import { openRazorpayCheckout } from "@/modules/payments/components/RazorpayCheckoutButton";
import { formatMoney } from "@/lib/format/money";
import { useRequiredInstallSettings } from "@/modules/install/components/InstallSettingsProvider";

type Props = {
  bookingId: string;
  amountRupees: number;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
};

export function PayNowButton({
  bookingId,
  amountRupees,
  customerName,
  customerEmail,
  customerPhone,
}: Props) {
  const settings = useRequiredInstallSettings();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (settings.country !== "IN") return null;

  async function onClick() {
    if (settings.country !== "IN") return;
    setBusy(true);
    try {
      const result = await createCustomerCheckoutAction({ bookingId });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      const outcome = await openRazorpayCheckout({
        orderId: result.data.orderId,
        amountRupees: result.data.amountRupees,
        bookingId,
        customerName,
        customerEmail,
        customerPhone,
      });
      if (outcome === "ok") {
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex h-11 min-w-28 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
    >
      {busy
        ? "Opening…"
        : `Pay now · ${formatMoney(amountRupees, {
            locale: settings.locale,
            currency: settings.currency,
          })}`}
    </button>
  );
}
