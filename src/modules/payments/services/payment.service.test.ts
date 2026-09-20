import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    booking: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/audit", () => ({
  writeAudit: vi.fn(),
}));

vi.mock("@/modules/install/queries/install", () => ({
  getInstallSettings: vi.fn().mockResolvedValue({ country: "IN" }),
}));

vi.mock("@/modules/payments/providers", () => ({
  getPaymentProvider: vi.fn(),
}));

import { db } from "@/lib/db";
import { getPaymentProvider } from "@/modules/payments/providers";
import { createPayment } from "./payment.service";

describe("createPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.booking.findFirst).mockResolvedValue({
      id: "bk-1",
      status: "COMPLETED",
      customer: { profile: { email: "a@b.c", phone: "+9198" } },
    } as never);
    vi.mocked(db.$transaction).mockImplementation(async (fn) =>
      fn({
        payment: {
          create: vi.fn().mockResolvedValue({
            id: "pay-1",
            bookingId: "bk-1",
            amount: 100,
            method: "CASH",
            status: "CAPTURED",
            providerOrderId: "MANUAL-1",
            txnRef: "MANUAL-1",
            capturedAt: new Date(),
            createdById: "staff-1",
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
          }),
        },
        auditLog: { create: vi.fn() },
      } as never),
    );
  });

  it("desk mode captures via Manual and never calls the gateway factory", async () => {
    const result = await createPayment(
      { bookingId: "bk-1", amount: 100, method: "CASH" },
      { id: "staff-1" },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.checkoutUrl).toBeUndefined();
      expect(result.data.payment.status).toBe("CAPTURED");
    }
    expect(getPaymentProvider).not.toHaveBeenCalled();
  });

  it("gateway mode uses the Razorpay provider", async () => {
    vi.mocked(getPaymentProvider).mockReturnValue({
      name: "RAZORPAY",
      charge: vi.fn().mockResolvedValue({
        providerRef: "order_abc",
        status: "PENDING",
        checkoutUrl: "https://checkout.razorpay.com/v1/checkout.js",
      }),
      refund: vi.fn(),
      fetchStatus: vi.fn(),
    });
    vi.mocked(db.$transaction).mockImplementation(async (fn) =>
      fn({
        payment: {
          create: vi.fn().mockResolvedValue({
            id: "pay-2",
            bookingId: "bk-1",
            amount: 199,
            method: "UPI",
            status: "PENDING",
            providerOrderId: "order_abc",
            txnRef: null,
            capturedAt: null,
            createdById: "cust-1",
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
          }),
        },
        auditLog: { create: vi.fn() },
      } as never),
    );

    const result = await createPayment(
      { bookingId: "bk-1", amount: 199, method: "UPI" },
      { id: "cust-1" },
      { mode: "gateway" },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.payment.providerOrderId).toBe("order_abc");
      expect(result.data.checkoutUrl).toContain("razorpay");
    }
    expect(getPaymentProvider).toHaveBeenCalledOnce();
  });
});
