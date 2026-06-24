import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvoiceStatus } from "@prisma/client";

vi.mock("@/lib/db", () => ({
  db: {
    invoice: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/audit", () => ({
  writeAudit: vi.fn(),
}));

import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { voidInvoice } from "./voidInvoice";

const INVOICE_ID = "inv-abc";
const BOOKING_ID = "booking-xyz";
const ACTOR = { id: "profile-admin" };

const FAKE_INVOICE = {
  id: INVOICE_ID,
  bookingId: BOOKING_ID,
  status: InvoiceStatus.ISSUED,
  deletedAt: null,
} as never;

describe("voidInvoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns NOT_FOUND when invoice does not exist", async () => {
    vi.mocked(db.invoice.findFirst).mockResolvedValue(null);

    const result = await voidInvoice(INVOICE_ID, ACTOR);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("runs transaction and calls writeAudit on success", async () => {
    vi.mocked(db.invoice.findFirst).mockResolvedValue(FAKE_INVOICE);

    const mockTx = {
      invoice: { update: vi.fn().mockResolvedValue({}) },
    };
    vi.mocked(db.$transaction).mockImplementation((async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn(mockTx);
    }) as never);

    const result = await voidInvoice(INVOICE_ID, ACTOR);

    expect(result.ok).toBe(true);
    expect(mockTx.invoice.update).toHaveBeenCalledWith({
      where: { id: INVOICE_ID },
      data: { status: "VOID", pdfUrl: null, updatedAt: expect.any(Date) },
    });
    expect(writeAudit).toHaveBeenCalledWith(mockTx, {
      entity: "Invoice",
      entityId: INVOICE_ID,
      action: "STATUS_CHANGE",
      byProfileId: ACTOR.id,
      diff: { before: { status: InvoiceStatus.ISSUED }, after: { status: "VOID" } },
    });
  });

  it("returns id and bookingId on success", async () => {
    vi.mocked(db.invoice.findFirst).mockResolvedValue(FAKE_INVOICE);
    vi.mocked(db.$transaction).mockImplementation((async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn({ invoice: { update: vi.fn() } });
    }) as never);

    const result = await voidInvoice(INVOICE_ID, ACTOR);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe(INVOICE_ID);
      expect(result.data.bookingId).toBe(BOOKING_ID);
    }
  });
});
