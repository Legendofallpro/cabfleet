/**
 * Payment gateway abstraction.
 * Phase 5 ships with ManualPaymentProvider only.
 * Phase 6+ swaps in Razorpay / Stripe by implementing this interface.
 */
export interface ChargeInput {
  bookingId: string;
  amount: number;
  method: string;
  txnRef?: string;
  capturedAt?: Date;
}

export interface ChargeResult {
  txnRef: string;
  capturedAt: Date;
}

export interface RefundInput {
  paymentId: string;
  amount: number;
  reason?: string;
}

export interface RefundResult {
  refundRef: string;
}

export interface PaymentProvider {
  /**
   * Record / initiate a charge. Returns provider transaction reference + capture time.
   * For manual provider, immediately marks captured.
   */
  charge(input: ChargeInput): Promise<ChargeResult>;

  /**
   * Refund a previously captured payment.
   */
  refund(input: RefundInput): Promise<RefundResult>;
}
