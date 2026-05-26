import type {
  ChargeInput,
  ChargeResult,
  PaymentProvider,
  RefundInput,
  RefundResult,
} from "./PaymentProvider";

/**
 * Manual (cash/offline) payment provider.
 * Records the payment as immediately captured — no external gateway call.
 * Used for Phase 5 MVP; Phase 6+ adds a real gateway by implementing PaymentProvider.
 */
export class ManualPaymentProvider implements PaymentProvider {
  async charge(input: ChargeInput): Promise<ChargeResult> {
    return {
      txnRef: input.txnRef ?? `MANUAL-${Date.now()}`,
      capturedAt: input.capturedAt ?? new Date(),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async refund(_input: RefundInput): Promise<RefundResult> {
    return {
      refundRef: `MANUAL-REFUND-${Date.now()}`,
    };
  }
}
