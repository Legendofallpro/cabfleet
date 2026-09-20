export function formatMoney(
  amount: number | string | { toString(): string },
  opts: { locale: string; currency: string },
): string {
  const n = typeof amount === "number" ? amount : Number(amount.toString());
  return new Intl.NumberFormat(opts.locale, {
    style: "currency",
    currency: opts.currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}
