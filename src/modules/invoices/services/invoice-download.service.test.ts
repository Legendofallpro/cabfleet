import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";

const createSignedUrl = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    invoice: { findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: () => ({
    storage: {
      from: () => ({ createSignedUrl }),
    },
  }),
}));

import { db } from "@/lib/db";
import { mintInvoiceDownloadUrl } from "./invoice-download.service";
import { SIGNED_URL_EXPIRY_SECS } from "@/modules/invoices/invoice-storage";

describe("mintInvoiceDownloadUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://signed.example/inv.pdf" },
      error: null,
    });
  });

  it("mints a short-lived URL after an ownership check", async () => {
    vi.mocked(db.invoice.findFirst).mockResolvedValue({
      id: "inv-1",
      number: "INV-202609-00001",
      pdfUrl: "org-a/inv-1.pdf",
      orgId: "org-a",
      booking: { customer: { profileId: "cust-1" } },
    } as never);

    const result = await mintInvoiceDownloadUrl("inv-1", {
      id: "staff-1",
      role: "STAFF",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.url).toContain("https://signed.example");
    expect(createSignedUrl).toHaveBeenCalledWith("org-a/inv-1.pdf", SIGNED_URL_EXPIRY_SECS);
  });

  it("404s when a customer does not own the booking", async () => {
    vi.mocked(db.invoice.findFirst).mockResolvedValue({
      id: "inv-1",
      number: "INV-202609-00001",
      pdfUrl: "org-a/inv-1.pdf",
      orgId: "org-a",
      booking: { customer: { profileId: "other" } },
    } as never);

    await expect(
      mintInvoiceDownloadUrl("inv-1", { id: "cust-1", role: "CUSTOMER" }),
    ).rejects.toEqual(expect.objectContaining({ code: "NOT_FOUND" } satisfies Partial<AppError>));
    expect(createSignedUrl).not.toHaveBeenCalled();
  });
});
