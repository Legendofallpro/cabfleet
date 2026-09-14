import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";

const writeAudit = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  db: {
    customer: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/audit", () => ({ writeAudit }));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/lib/org-context", () => ({
  runWithoutOrg: (_reason: string, fn: () => Promise<unknown>) => fn(),
}));

import { db } from "@/lib/db";
import { eraseCustomer } from "./eraseCustomer";

describe("eraseCustomer audit diff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes sha256 hashes of email/phone and no plaintext PII", async () => {
    const email = "guest@example.com";
    const phone = "+919876543210";
    vi.mocked(db.customer.findFirst).mockResolvedValue({
      id: "cust-1",
      profile: {
        id: "prof-1",
        email,
        phone,
        fullName: "Ada Lovelace",
      },
    } as never);

    vi.mocked(db.$transaction).mockImplementation(async (fn) => {
      const tx = {
        notificationLog: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
        notificationOutbox: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
        profile: { update: vi.fn() },
        customer: { update: vi.fn() },
        booking: {
          count: vi.fn().mockResolvedValue(0),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          findMany: vi.fn().mockResolvedValue([]),
        },
        tripLocation: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
      };
      return fn(tx as never);
    });

    await eraseCustomer(
      { customerId: "cust-1", dsrRequestId: "dsr-99" },
      { id: "admin-1" },
    );

    expect(writeAudit).toHaveBeenCalledTimes(1);
    const diff = writeAudit.mock.calls[0]![1].diff as Record<string, unknown>;
    const serialized = JSON.stringify(diff);
    expect(serialized).not.toMatch(/@/);
    expect(serialized).not.toContain("+91");
    expect(serialized).not.toContain("Ada");
    expect(diff.dsrRequestId).toBe("dsr-99");
    expect((diff.before as { emailHash: string }).emailHash).toBe(
      createHash("sha256").update(email).digest("hex"),
    );
    expect((diff.before as { phoneHash: string }).phoneHash).toBe(
      createHash("sha256").update(phone).digest("hex"),
    );
  });
});
