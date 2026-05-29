"use client";

/**
 * Razorpay Checkout button (Phase 7 W3 §7.5).
 *
 * Lazy-loads `https://checkout.razorpay.com/v1/checkout.js` on first
 * click, then opens the modal with the order id returned by
 * `createPayment(...)`. On success the modal closes and the customer is
 * routed to `/portal/bookings/{bookingId}` — the booking page is the
 * canonical "payment status" surface because the webhook flip is async.
 *
 * Importantly this is *not* a form: the order was already created server-
 * side (see `RecordPaymentForm.tsx`), which means the amount + provider
 * order id come from the server lookup, not from user input. That's S5
 * (server-lookup binding) — the customer cannot tamper with what they
 * pay for.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { env } from "@/lib/env";

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

// Razorpay's window-level constructor isn't typed in @types — declare the
// narrow surface we use to keep tsc honest.
type RazorpayOptions = {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  prefill?: { email?: string; contact?: string; name?: string };
  notes?: Record<string, string>;
  handler?: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: { ondismiss?: () => void };
};
type RazorpayConstructor = new (opts: RazorpayOptions) => { open: () => void };
declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

async function loadCheckoutScript(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (window.Razorpay) return true;
  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(Boolean(window.Razorpay)));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve(Boolean(window.Razorpay));
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

type Props = {
  orderId: string;
  /** Amount in rupees — converted to paise for the modal. */
  amountRupees: number;
  bookingId: string;
  /** Customer prefill (optional but reduces drop-off). */
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  /** Button label. */
  children?: React.ReactNode;
};

export function RazorpayCheckoutButton({
  orderId,
  amountRupees,
  bookingId,
  customerName,
  customerEmail,
  customerPhone,
  children,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const keyId = env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

  async function onClick() {
    if (!keyId) {
      toast.error("Razorpay is not configured. Contact support.");
      return;
    }
    setBusy(true);
    try {
      const loaded = await loadCheckoutScript();
      if (!loaded || !window.Razorpay) {
        toast.error("Could not load the payment widget. Please try again.");
        return;
      }

      const rzp = new window.Razorpay({
        key: keyId,
        order_id: orderId,
        // Razorpay's modal expects paise. Math.round is the canonical
        // rupees→paise conversion (matches src/modules/payments/providers/razorpay/units.ts).
        amount: Math.round(amountRupees * 100),
        currency: "INR",
        name: "CabFleet",
        description: `Booking ${bookingId}`,
        prefill: {
          name: customerName ?? undefined,
          email: customerEmail ?? undefined,
          contact: customerPhone ?? undefined,
        },
        notes: { bookingId },
        handler: () => {
          // We deliberately don't trust the client-side handler payload —
          // the webhook is the source of truth. Route to the booking page;
          // the captured state will surface there once the webhook lands
          // (usually <2s).
          toast.success("Payment submitted. We'll confirm in a moment.");
          router.push(`/portal/bookings/${bookingId}`);
          router.refresh();
        },
        modal: {
          ondismiss: () => {
            toast.message("Payment cancelled.");
          },
        },
      });

      rzp.open();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-50"
    >
      {busy ? "Loading…" : (children ?? "Pay with Razorpay")}
    </button>
  );
}
