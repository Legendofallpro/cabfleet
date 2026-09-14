import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    webhookEvent: {
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { db } from "@/lib/db";
import { withIdempotency } from "@/lib/webhooks";

describe("withIdempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("processes a fresh event", async () => {
    vi.mocked(db.webhookEvent.create).mockResolvedValue({ id: "wh-1" } as never);
    const fn = vi.fn().mockResolvedValue(undefined);

    const result = await withIdempotency(
      {
        provider: "RAZORPAY",
        eventId: "evt_1",
        eventCreatedAt: new Date(Date.now() - 60 * 60 * 1000),
        payload: { event: "payment.captured" },
      },
      fn,
    );

    expect(result).toEqual({ ok: true, processed: true });
    expect(fn).toHaveBeenCalledOnce();
    expect(db.webhookEvent.delete).not.toHaveBeenCalled();
  });

  it("returns duplicate on unique constraint", async () => {
    vi.mocked(db.webhookEvent.create).mockRejectedValue(new Error("P2002 unique"));
    const fn = vi.fn();

    const result = await withIdempotency(
      {
        provider: "RAZORPAY",
        eventId: "evt_1",
        eventCreatedAt: new Date(),
        payload: {},
      },
      fn,
    );

    expect(result).toEqual({ ok: true, processed: false, reason: "duplicate" });
    expect(fn).not.toHaveBeenCalled();
  });

  it("deletes the row when processing throws so retries can run", async () => {
    vi.mocked(db.webhookEvent.create).mockResolvedValue({ id: "wh-1" } as never);
    vi.mocked(db.webhookEvent.delete).mockResolvedValue({} as never);
    const fn = vi.fn().mockRejectedValue(new Error("boom"));

    await expect(
      withIdempotency(
        {
          provider: "RAZORPAY",
          eventId: "evt_1",
          eventCreatedAt: new Date(),
          payload: {},
        },
        fn,
      ),
    ).rejects.toThrow("boom");

    expect(db.webhookEvent.delete).toHaveBeenCalledWith({ where: { id: "wh-1" } });
  });
});
