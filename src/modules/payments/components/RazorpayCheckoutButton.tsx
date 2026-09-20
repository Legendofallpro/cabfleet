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
import { useInstallSettings } from "@/modules/install/components/InstallSettingsProvider";

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

type RazorpayOpenArgs = {
  orderId: string;
  amountRupees: number;
  bookingId: string;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
};

export async function openRazorpayCheckout(args: RazorpayOpenArgs): Promise<"ok" | "error"> {
  const keyId = env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  if (!keyId) {
    toast.error("Razorpay is not configured. Contact support.");
    return "error";
  }
  const loaded = await loadCheckoutScript();
  if (!loaded || !window.Razorpay) {
    toast.error("Could not load the payment widget. Please try again.");
    return "error";
  }

  return new Promise((resolve) => {
    const rzp = new window.Razorpay!({
      key: keyId,
      order_id: args.orderId,
      amount: Math.round(args.amountRupees * 100),
      currency: "INR",
      name: "CabFleet",
      description: `Booking ${args.bookingId}`,
      prefill: {
        name: args.customerName ?? undefined,
        email: args.customerEmail ?? undefined,
        contact: args.customerPhone ?? undefined,
      },
      notes: { bookingId: args.bookingId },
      handler: () => {
        toast.success("Payment submitted. We'll confirm in a moment.");
        resolve("ok");
      },
      modal: {
        ondismiss: () => {
          toast.message("Payment cancelled.");
          resolve("ok");
        },
      },
    });
    rzp.open();
  });
}

export function RazorpayCheckoutButton({
  orderId,
  amountRupees,
  bookingId,
  customerName,
  customerEmail,
  customerPhone,
  children,
}: {
  orderId: string;
  amountRupees: number;
  bookingId: string;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  children?: React.ReactNode;
}) {
  const settings = useInstallSettings();
  if (settings?.country !== "IN") return null;

  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    try {
      const outcome = await openRazorpayCheckout({
        orderId,
        amountRupees,
        bookingId,
        customerName,
        customerEmail,
        customerPhone,
      });
      if (outcome === "ok") {
        router.push(`/portal/bookings/${bookingId}`);
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
      className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary-hover disabled:opacity-50"
    >
      {busy ? "Loading…" : (children ?? "Pay with Razorpay")}
    </button>
  );
}
