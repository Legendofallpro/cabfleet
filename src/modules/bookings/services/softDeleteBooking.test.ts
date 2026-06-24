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

import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { softDeleteBooking } from "./softDeleteBooking";

const BOOKING_ID = "booking-abc";
const ACTOR = { id: "profile-admin" };

const FAKE_BOOKING = { id: BOOKING_ID, deletedAt: null } as never;

describe("softDeleteBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns NOT_FOUND when booking does not exist", async () => {
    vi.mocked(db.booking.findFirst).mockResolvedValue(null);

    const result = await softDeleteBooking(BOOKING_ID, ACTOR);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("returns NOT_FOUND for already soft-deleted bookings (idempotent guard)", async () => {
    // findFirst with deletedAt: null filter will return null for deleted bookings
    vi.mocked(db.booking.findFirst).mockResolvedValue(null);

    const result = await softDeleteBooking(BOOKING_ID, ACTOR);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });

  it("runs transaction and calls writeAudit on success", async () => {
    vi.mocked(db.booking.findFirst).mockResolvedValue(FAKE_BOOKING);

    const mockTx = {
      booking: { update: vi.fn().mockResolvedValue({}) },
    };
    vi.mocked(db.$transaction).mockImplementation((async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn(mockTx);
    }) as never);

    const result = await softDeleteBooking(BOOKING_ID, ACTOR);

    expect(result.ok).toBe(true);
    expect(mockTx.booking.update).toHaveBeenCalledWith({
      where: { id: BOOKING_ID },
      data: { deletedAt: expect.any(Date) },
    });
    expect(writeAudit).toHaveBeenCalledWith(mockTx, {
      entity: "Booking",
      entityId: BOOKING_ID,
      action: "DELETE",
      byProfileId: ACTOR.id,
    });
  });

  it("returns ok(true) on success", async () => {
    vi.mocked(db.booking.findFirst).mockResolvedValue(FAKE_BOOKING);
    vi.mocked(db.$transaction).mockImplementation((async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn({ booking: { update: vi.fn() } });
    }) as never);

    const result = await softDeleteBooking(BOOKING_ID, ACTOR);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(true);
    }
  });
});
