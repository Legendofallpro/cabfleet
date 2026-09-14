import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    payment: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/audit", () => ({ writeAudit: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/org-context", () => ({
  runWithoutOrg: (_reason: string, fn: () => Promise<unknown>) => fn(),
}));

import { db } from "@/lib/db";
import { recordPaymentFromWebhook } from "./recordPaymentFromWebhook";

function capturedEvent(overrides: {
  amount?: number;
  currency?: string;
  orderId?: string;
} = {}) {
  return {
    event: "payment.captured",
    created_at: Math.floor(Date.now() / 1000),
    payload: {
      payment: {
        entity: {
          id: "pay_rzp",
          order_id: overrides.orderId ?? "order_1",
          status: "captured",
          amount: overrides.amount ?? 10000,
          currency: overrides.currency ?? "INR",
        },
      },
    },
  };
}

describe("recordPaymentFromWebhook capture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("no-ops when the captured amount does not match the local row", async () => {
    vi.mocked(db.payment.findFirst).mockResolvedValue({
      id: "pay-1",
      status: "PENDING",
      orgId: "org-1",
      bookingId: "bk-1",
      amount: 100,
    } as never);

    const outcome = await recordPaymentFromWebhook(capturedEvent({ amount: 5000 }));
    expect(outcome).toEqual({ kind: "noop", reason: "amount_mismatch" });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("no-ops when the payment is already refunded", async () => {
    vi.mocked(db.payment.findFirst).mockResolvedValue({
      id: "pay-1",
      status: "REFUNDED",
      orgId: "org-1",
      bookingId: "bk-1",
      amount: 100,
    } as never);

    const outcome = await recordPaymentFromWebhook(capturedEvent());
    expect(outcome).toEqual({ kind: "noop", reason: "already_refunded" });
  });

  it("captures a matching PENDING payment", async () => {
    vi.mocked(db.payment.findFirst).mockResolvedValue({
      id: "pay-1",
      status: "PENDING",
      orgId: "org-1",
      bookingId: "bk-1",
      amount: 100,
    } as never);
    vi.mocked(db.$transaction).mockImplementation(async (fn) =>
      fn({
        payment: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
        auditLog: { create: vi.fn() },
      } as never),
    );

    const outcome = await recordPaymentFromWebhook(capturedEvent());
    expect(outcome).toEqual({
      kind: "applied",
      paymentId: "pay-1",
      newStatus: "CAPTURED",
    });
  });
});

describe("recordPaymentFromWebhook refund", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not mark a payment fully refunded for a partial unmatched refund", async () => {
    vi.mocked(db.payment.findFirst).mockResolvedValue({
      id: "pay-1",
      status: "CAPTURED",
      amount: 100,
      orgId: "org-1",
    } as never);

    vi.mocked(db.$transaction).mockImplementation(async (fn) =>
      fn({
        refund: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({
            id: "rf-off",
            status: "SUCCEEDED",
            amount: 1,
            paymentId: "pay-1",
          }),
          findMany: vi.fn().mockResolvedValue([{ amount: 1 }]),
        },
        payment: { update: vi.fn() },
        auditLog: { create: vi.fn() },
      } as never),
    );

    const outcome = await recordPaymentFromWebhook({
      event: "refund.processed",
      created_at: Math.floor(Date.now() / 1000),
      payload: {
        refund: {
          entity: { id: "rfnd_1", payment_id: "pay_rzp", amount: 100 },
        },
      },
    });

    expect(outcome.kind).toBe("applied");
    if (outcome.kind === "applied") {
      expect(outcome.newStatus).toBe("CAPTURED");
    }
  });
});
