import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";

vi.mock("@/lib/env", () => ({
  env: { PAYMENT_GATEWAY: "RAZORPAY" },
}));

vi.mock("@/lib/db", () => ({
  db: {
    booking: { findFirst: vi.fn() },
    payment: { findFirst: vi.fn() },
  },
}));

vi.mock("@/modules/payments/queries/payment", () => ({
  getBookingOutstanding: vi.fn(),
}));

vi.mock("@/modules/payments/services/payment.service", () => ({
  createPayment: vi.fn(),
}));

import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { getBookingOutstanding } from "@/modules/payments/queries/payment";
import { createPayment } from "@/modules/payments/services/payment.service";
import { createCustomerCheckout } from "./customer-checkout.service";

const ACTOR = { id: "prof-cust", customerId: "cust-1" };

describe("createCustomerCheckout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (env as { PAYMENT_GATEWAY: string }).PAYMENT_GATEWAY = "RAZORPAY";
  });

  it("rejects when the booking is not the customer's", async () => {
    vi.mocked(db.booking.findFirst).mockResolvedValue(null);

    await expect(createCustomerCheckout("bk-other", ACTOR)).rejects.toEqual(
      expect.objectContaining({ code: "NOT_FOUND" } satisfies Partial<AppError>),
    );
    expect(createPayment).not.toHaveBeenCalled();
  });

  it("rejects when outstanding is zero", async () => {
    vi.mocked(db.booking.findFirst).mockResolvedValue({
      id: "bk-1",
      status: "COMPLETED",
    } as never);
    vi.mocked(getBookingOutstanding).mockResolvedValue({
      outstanding: 0,
      captured: 500,
      breakdown: {
        transport: 500,
        toll: 0,
        parking: 0,
        extras: 0,
        gstRate: 0,
        gst: 0,
        subtotal: 500,
        total: 500,
      },
    });

    await expect(createCustomerCheckout("bk-1", ACTOR)).rejects.toEqual(
      expect.objectContaining({ code: "VALIDATION" } satisfies Partial<AppError>),
    );
  });

  it("reuses a pending Razorpay order for the same amount", async () => {
    vi.mocked(db.booking.findFirst).mockResolvedValue({
      id: "bk-1",
      status: "COMPLETED",
    } as never);
    vi.mocked(getBookingOutstanding).mockResolvedValue({
      outstanding: 250,
      captured: 0,
      breakdown: {
        transport: 250,
        toll: 0,
        parking: 0,
        extras: 0,
        gstRate: 0,
        gst: 0,
        subtotal: 250,
        total: 250,
      },
    });
    vi.mocked(db.payment.findFirst).mockResolvedValue({
      amount: 250,
      providerOrderId: "order_abc",
    } as never);

    const result = await createCustomerCheckout("bk-1", ACTOR);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ orderId: "order_abc", amountRupees: 250 });
    }
    expect(createPayment).not.toHaveBeenCalled();
  });

  it("creates a payment using the server outstanding, not a client amount", async () => {
    vi.mocked(db.booking.findFirst).mockResolvedValue({
      id: "bk-1",
      status: "COMPLETED",
    } as never);
    vi.mocked(getBookingOutstanding).mockResolvedValue({
      outstanding: 199,
      captured: 0,
      breakdown: {
        transport: 199,
        toll: 0,
        parking: 0,
        extras: 0,
        gstRate: 0,
        gst: 0,
        subtotal: 199,
        total: 199,
      },
    });
    vi.mocked(db.payment.findFirst).mockResolvedValue(null);
    vi.mocked(createPayment).mockResolvedValue({
      ok: true,
      data: {
        payment: { providerOrderId: "order_new" },
        checkoutUrl: "https://checkout.razorpay.com/v1/checkout.js",
      },
    } as never);

    const result = await createCustomerCheckout("bk-1", ACTOR);
    expect(result.ok).toBe(true);
    expect(createPayment).toHaveBeenCalledWith(
      { bookingId: "bk-1", amount: 199, method: "UPI" },
      { id: ACTOR.id },
      { mode: "gateway" },
    );
  });

  it("rejects cancelled bookings", async () => {
    vi.mocked(db.booking.findFirst).mockResolvedValue({
      id: "bk-1",
      status: "CANCELLED",
    } as never);

    await expect(createCustomerCheckout("bk-1", ACTOR)).rejects.toEqual(
      expect.objectContaining({ code: "VALIDATION" } satisfies Partial<AppError>),
    );
    expect(createPayment).not.toHaveBeenCalled();
  });

  it("rejects when the gateway is MANUAL", async () => {
    (env as { PAYMENT_GATEWAY: string }).PAYMENT_GATEWAY = "MANUAL";
    await expect(createCustomerCheckout("bk-1", ACTOR)).rejects.toEqual(
      expect.objectContaining({ code: "VALIDATION" } satisfies Partial<AppError>),
    );
  });
});
