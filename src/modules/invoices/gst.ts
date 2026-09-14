/** GST helpers for invoice PDFs and outstanding balance. Pure — safe in tests. */

export const GST_SAC_CODE = "9964";
export const GST_RATES = [0, 5, 12] as const;
export type GstRate = (typeof GST_RATES)[number];

export function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function isGstRate(n: number): n is GstRate {
  return (GST_RATES as readonly number[]).includes(n);
}

export type GstBreakdownInput = {
  fareEstimate: number | null;
  fareFinal: number | null;
  tollAmount: number;
  parkingAmount: number;
  gstRate: number;
};

export type GstBreakdown = {
  transport: number;
  toll: number;
  parking: number;
  extras: number;
  gstRate: GstRate;
  gst: number;
  subtotal: number;
  total: number;
};

/**
 * Transport is the quoted / estimated fare. `fareFinal` is stored as
 * transport + toll + parking (see transitionBookingStatus on COMPLETED),
 * so extras are peeled off when a final fare exists.
 *
 * GST applies to the transport line only. Rate 0 → gst is 0.
 */
export function gstBreakdown(input: GstBreakdownInput): GstBreakdown {
  const toll = roundMoney(Math.max(0, Number(input.tollAmount) || 0));
  const parking = roundMoney(Math.max(0, Number(input.parkingAmount) || 0));
  const extras = roundMoney(toll + parking);

  const transport = roundMoney(
    input.fareFinal != null
      ? Math.max(0, Number(input.fareFinal) - extras)
      : Math.max(0, Number(input.fareEstimate) || 0),
  );

  const gstRate: GstRate = isGstRate(input.gstRate) ? input.gstRate : 0;
  const gst = gstRate > 0 ? roundMoney(transport * (gstRate / 100)) : 0;
  const subtotal = roundMoney(transport + extras);
  const total = roundMoney(subtotal + gst);

  return { transport, toll, parking, extras, gstRate, gst, subtotal, total };
}
