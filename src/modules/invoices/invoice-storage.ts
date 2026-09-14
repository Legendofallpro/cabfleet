export const INVOICE_BUCKET = "invoices";

/** Short-lived signed URL TTL (seconds). Minted only after an ownership check. */
export const SIGNED_URL_EXPIRY_SECS = 300;

export function invoiceStoragePath(orgId: string, invoiceId: string): string {
  return `${orgId}/${invoiceId}.pdf`;
}

export function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export function portalInvoiceUrl(appUrl: string, bookingId: string): string {
  const base = appUrl.replace(/\/$/, "");
  return `${base}/portal/bookings/${bookingId}`;
}
