import type {
  ChargeInput,
  ChargeResult,
  FetchStatusResult,
  PaymentProvider,
  RefundInput,
  RefundResult,
} from "@/modules/payments/providers/PaymentProvider";

/**
 * Manual (cash/offline) provider. Records the payment as immediately
 * captured — no external gateway call, no checkout redirect. Desk Record
 * Payment always uses this provider, even when Razorpay is enabled.
 */
export class ManualPaymentProvider implements PaymentProvider {
  readonly name = "MANUAL" as const;

  async charge(input: ChargeInput): Promise<ChargeResult> {
    return {
      providerRef: input.txnRef ?? `MANUAL-${Date.now()}`,
      status: "CAPTURED",
      capturedAt: input.capturedAt ?? new Date(),
    };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    return {
      refundRef: `MANUAL-REFUND-${input.paymentId}-${Date.now()}`,
    };
  }

  async fetchStatus(providerRef: string): Promise<FetchStatusResult> {
    // Manual payments are CAPTURED at creation. fetchStatus is a no-op that
    // confirms whatever is already on the row; the reconciliation cron will
    // see no PENDING manual payments to act on.
    return { status: "CAPTURED", providerPaymentId: providerRef };
  }
}
