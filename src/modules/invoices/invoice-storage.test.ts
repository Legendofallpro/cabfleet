import { describe, expect, it } from "vitest";
import {
  SIGNED_URL_EXPIRY_SECS,
  invoiceStoragePath,
  isHttpUrl,
  portalInvoiceUrl,
} from "./invoice-storage";

describe("invoice storage helpers", () => {
  it("keeps signed URL TTL between 60 and 300 seconds", () => {
    expect(SIGNED_URL_EXPIRY_SECS).toBeGreaterThanOrEqual(60);
    expect(SIGNED_URL_EXPIRY_SECS).toBeLessThanOrEqual(300);
  });

  it("stores PDFs under orgId/invoiceId.pdf", () => {
    expect(invoiceStoragePath("org_1", "inv_9")).toBe("org_1/inv_9.pdf");
  });

  it("treats stored paths as non-URLs", () => {
    expect(isHttpUrl("org_1/inv_9.pdf")).toBe(false);
    expect(isHttpUrl("https://example.supabase.co/storage/v1/object/sign/invoices/x.pdf")).toBe(
      true,
    );
  });

  it("shares the authenticated portal booking page, never a signed URL", () => {
    expect(portalInvoiceUrl("https://app.example", "booking-1")).toBe(
      "https://app.example/portal/bookings/booking-1",
    );
  });
});
