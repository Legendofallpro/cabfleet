import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: vi.fn(),
    refund: {
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/audit", () => ({ writeAudit: vi.fn() }));

vi.mock("@/modules/install/queries/install", () => ({
  getInstallSettings: vi.fn().mockResolvedValue({ country: "IN" }),
}));

vi.mock("@/modules/payments/providers", () => ({
  getPaymentProvider: vi.fn(),
}));

import { db } from "@/lib/db";
import { getPaymentProvider } from "@/modules/payments/providers";
import { approveRefund, requestRefund } from "./refund.service";

describe("requestRefund", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects amounts over remaining inside the lock", async () => {
    vi.mocked(db.$transaction).mockImplementation(async (fn) =>
      fn({
        $queryRaw: vi.fn().mockResolvedValue([
          { id: "pay-1", status: "CAPTURED", amount: 100 },
        ]),
        refund: {
          findMany: vi.fn().mockResolvedValue([{ amount: 80 }]),
          create: vi.fn(),
        },
      } as never),
    );

    await expect(
      requestRefund(
        { paymentId: "pay-1", amount: 50, reason: "oops" },
        { id: "admin-1" },
      ),
    ).rejects.toEqual(expect.objectContaining({ code: "VALIDATION" } satisfies Partial<AppError>));
  });
});

describe("approveRefund", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not call the provider when the REQUESTED claim loses the race", async () => {
    vi.mocked(db.$transaction).mockImplementation(async (fn) =>
      fn({
        refund: {
          findFirst: vi.fn().mockResolvedValue({
            id: "rf-1",
            status: "REQUESTED",
            requestedById: "admin-1",
            paymentId: "pay-1",
            amount: 100,
            reason: "dup",
            providerRefundId: null,
            payment: { amount: 100, txnRef: "pay_rzp" },
          }),
          findMany: vi.fn().mockResolvedValue([]),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
        $queryRaw: vi.fn().mockResolvedValue([]),
      } as never),
    );

    await expect(approveRefund("rf-1", { id: "admin-2" })).rejects.toEqual(
      expect.objectContaining({ code: "CONFLICT" } satisfies Partial<AppError>),
    );
    expect(getPaymentProvider).not.toHaveBeenCalled();
  });
});
