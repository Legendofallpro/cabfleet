/**
 * Payment provider factory (Phase 7 W3 §3.1).
 *
 * Selection rule:
 *   - `PAYMENT_GATEWAY=RAZORPAY` AND all three Razorpay env vars set →
 *     `RazorpayPaymentProvider`.
 *   - `PAYMENT_GATEWAY=RAZORPAY` with incomplete env → throw (fail-closed).
 *   - Anything else → `ManualPaymentProvider`.
 *
 * Desk Record Payment never uses this factory — it always captures via
 * ManualPaymentProvider. Customer Pay now is the only Razorpay charge path.
 *
 * The provider is selected lazily once per process. Tests can clear the
 * cache via `__resetPaymentProviderForTests()`.
 */
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { ManualPaymentProvider } from "@/modules/payments/providers/ManualPaymentProvider";
import { RazorpayPaymentProvider } from "@/modules/payments/providers/RazorpayPaymentProvider";
import type { PaymentProvider } from "@/modules/payments/providers/PaymentProvider";

let cached: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (cached) return cached;

  if (env.PAYMENT_GATEWAY === "RAZORPAY") {
    if (
      !env.RAZORPAY_KEY_ID ||
      !env.RAZORPAY_KEY_SECRET ||
      !env.RAZORPAY_WEBHOOK_SECRET
    ) {
      throw new AppError(
        "INTERNAL",
        "Razorpay is enabled but RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, or RAZORPAY_WEBHOOK_SECRET is missing.",
      );
    }
    cached = new RazorpayPaymentProvider();
    return cached;
  }

  cached = new ManualPaymentProvider();
  return cached;
}

/** Test-only escape hatch. Don't call from app code. */
export function __resetPaymentProviderForTests(): void {
  cached = null;
}
