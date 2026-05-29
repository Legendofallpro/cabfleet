/**
 * Razorpay payment provider (Phase 7 W3 §3.2).
 *
 * Flow:
 *   1. charge()  → creates a Razorpay Order, returns PENDING + a checkout
 *                  URL. We do NOT mark the Payment as CAPTURED here.
 *   2. The customer completes Checkout on the client.
 *   3. Razorpay POSTs `payment.captured` to /api/webhooks/razorpay.
 *   4. recordPaymentFromWebhook updates the local Payment row.
 *
 * Failure modes that callers MUST handle:
 *   - Missing API credentials → provider throws on construction. The
 *     factory (`providers/index.ts`) falls back to Manual when env is
 *     incomplete, so this only fires for misconfigured prod deploys.
 *   - Razorpay API errors → bubble up as Error; payment.service.ts maps
 *     to AppError and the transaction rolls back.
 */
import Razorpay from "razorpay";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import type {
  ChargeInput,
  ChargeResult,
  FetchStatusResult,
  PaymentProvider,
  RefundInput,
  RefundResult,
} from "@/modules/payments/providers/PaymentProvider";
import { toPaise } from "@/modules/payments/providers/razorpay/units";

const CHECKOUT_BASE = "https://checkout.razorpay.com/v1/checkout.js";

export class RazorpayPaymentProvider implements PaymentProvider {
  readonly name = "RAZORPAY" as const;

  private client: Razorpay | null = null;

  private getClient(): Razorpay {
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
      throw new Error(
        "RazorpayPaymentProvider: RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing",
      );
    }
    if (!this.client) {
      this.client = new Razorpay({
        key_id: env.RAZORPAY_KEY_ID,
        key_secret: env.RAZORPAY_KEY_SECRET,
      });
    }
    return this.client;
  }

  async charge(input: ChargeInput): Promise<ChargeResult> {
    const client = this.getClient();
    const amountInPaise = toPaise(input.amount);

    // `receipt` is reflected in dashboards but bounded to 40 chars by
    // Razorpay; the booking id (cuid, 25 chars) fits with the prefix.
    const order = await client.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `bk_${input.bookingId.slice(-30)}`,
      // `notes` is NOT trusted server-side — S5 mandates lookup by
      // providerOrderId from the DB. We still set bookingId here for
      // dashboard correlation, but recordPaymentFromWebhook ignores it.
      notes: {
        bookingId: input.bookingId,
        method: input.method,
      },
    });

    logger.info(
      { providerOrderId: order.id, bookingId: input.bookingId, amount: amountInPaise },
      "razorpay.order.created",
    );

    return {
      providerRef: order.id,
      status: "PENDING",
      checkoutUrl: CHECKOUT_BASE,
    };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    const client = this.getClient();
    if (!input.providerPaymentId) {
      throw new Error(
        "RazorpayPaymentProvider.refund: providerPaymentId required " +
          "(populated when the payment captures via webhook)",
      );
    }
    const refund = await client.payments.refund(input.providerPaymentId, {
      amount: toPaise(input.amount),
      notes: input.reason ? { reason: input.reason } : undefined,
    });

    logger.info(
      {
        refundRef: refund.id,
        providerPaymentId: input.providerPaymentId,
        amount: input.amount,
      },
      "razorpay.refund.created",
    );

    return { refundRef: refund.id };
  }

  async fetchStatus(providerRef: string): Promise<FetchStatusResult> {
    const client = this.getClient();
    // providerRef is the Order id. Fetch payments under the order; if any
    // captured, the order is captured.
    const result = await client.orders.fetchPayments(providerRef);
    const payments = result.items ?? [];
    const captured = payments.find((p) => p.status === "captured");
    if (captured) {
      return { status: "CAPTURED", providerPaymentId: captured.id };
    }
    const failed = payments.find((p) => p.status === "failed");
    if (failed) {
      return { status: "FAILED", providerPaymentId: failed.id };
    }
    return { status: "PENDING", providerPaymentId: payments[0]?.id ?? null };
  }
}
