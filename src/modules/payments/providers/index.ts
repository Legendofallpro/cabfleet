/**
 * Payment provider factory (Phase 7 W3 §3.1).
 *
 * Selection rule:
 *   - `PAYMENT_GATEWAY=RAZORPAY` AND all three Razorpay env vars set →
 *     `RazorpayPaymentProvider`.
 *   - Anything else → `ManualPaymentProvider` (safe fallback).
 *
 * The provider is selected lazily once per process. Tests can clear the
 * cache via `__resetPaymentProviderForTests()`.
 */
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
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
      logger.warn(
        { gateway: env.PAYMENT_GATEWAY },
        "payment.provider.razorpay_env_incomplete.falling_back_to_manual",
      );
      cached = new ManualPaymentProvider();
      return cached;
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
