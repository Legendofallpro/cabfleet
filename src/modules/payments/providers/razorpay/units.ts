/**
 * Currency-unit conversion for Razorpay (Phase 7 W3 §6.3).
 *
 * Razorpay APIs deal in **paise** (integer); `Payment.amount` is stored in
 * **rupees** as `Decimal(10, 2)`. Mixing the two has historically been the
 * top source of bug reports in similar codebases — every call into the
 * Razorpay SDK MUST go through these helpers.
 */
import { Prisma } from "@prisma/client";

const PAISE_PER_RUPEE = 100;

/**
 * Convert rupees (Prisma Decimal | number) to paise (integer). Rounds half-up
 * at the paise boundary to mirror Razorpay's own behaviour for fractional
 * paise — though our schema (`Decimal(10, 2)`) caps precision at paise already.
 */
export function toPaise(rupees: Prisma.Decimal | number | string): number {
  const dec =
    rupees instanceof Prisma.Decimal ? rupees : new Prisma.Decimal(rupees);
  const paiseDec = dec.mul(PAISE_PER_RUPEE);
  return Math.round(paiseDec.toNumber());
}

/** Convert paise (integer from Razorpay) back to a Prisma Decimal in rupees. */
export function fromPaise(paise: number): Prisma.Decimal {
  return new Prisma.Decimal(paise).div(PAISE_PER_RUPEE);
}
