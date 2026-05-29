/**
 * PaymentProvider contract (Phase 7 W3 §3.2).
 *
 * Two implementations live next to this file:
 *   - ManualPaymentProvider   (offline / cash; immediate CAPTURED)
 *   - RazorpayPaymentProvider (real gateway; PENDING → webhook → CAPTURED)
 *
 * Async flows are first-class: `charge()` returns a status discriminant +
 * optional `checkoutUrl` so callers can redirect to Razorpay Checkout.
 * `fetchStatus()` exists for the reconciliation cron (plan §6.3) that
 * picks up payments stuck in PENDING when the webhook is lost.
 */

export interface ChargeInput {
  bookingId: string;
  /** Amount in rupees (Decimal-safe). Provider converts to paise internally. */
  amount: number;
  /** Free-text method label ("UPI", "CARD", "CASH"). */
  method: string;
  /** Manual-only: caller-supplied receipt reference. */
  txnRef?: string;
  /** Manual-only: caller-supplied capture timestamp. */
  capturedAt?: Date;
  /** Customer contact (Razorpay prefills the checkout form). */
  customerEmail?: string | null;
  customerPhone?: string | null;
}

export type ChargeStatus = "PENDING" | "CAPTURED" | "FAILED";

export interface ChargeResult {
  /**
   * Provider-side identifier created by this charge call.
   * - Razorpay: the Order id (`order_...`).
   * - Manual:   a synthetic `MANUAL-{ts}` string.
   */
  providerRef: string;
  status: ChargeStatus;
  /** Set for async gateways — the client opens this in Checkout. */
  checkoutUrl?: string;
  /** Capture time. Set immediately by Manual; later by the webhook for Razorpay. */
  capturedAt?: Date;
}

export interface RefundInput {
  paymentId: string;
  /** Amount in rupees. Partial refunds allowed (< Payment.amount). */
  amount: number;
  reason?: string;
  /** Provider-side payment id to refund against (Razorpay payment id). */
  providerPaymentId?: string | null;
}

export interface RefundResult {
  refundRef: string;
}

export interface FetchStatusResult {
  status: ChargeStatus;
  /** Provider-side payment id if known (Razorpay sets this on capture). */
  providerPaymentId?: string | null;
}

export interface PaymentProvider {
  readonly name: "MANUAL" | "RAZORPAY";

  /**
   * Initiate a charge. Manual marks captured immediately; Razorpay returns
   * PENDING + a checkout URL and waits for the webhook to flip to CAPTURED.
   */
  charge(input: ChargeInput): Promise<ChargeResult>;

  /** Refund a previously captured payment. Partial refunds allowed. */
  refund(input: RefundInput): Promise<RefundResult>;

  /**
   * Fetch the current status from the provider. Used by the reconciliation
   * cron when a webhook is lost; called with the provider's order ref.
   */
  fetchStatus(providerRef: string): Promise<FetchStatusResult>;
}
