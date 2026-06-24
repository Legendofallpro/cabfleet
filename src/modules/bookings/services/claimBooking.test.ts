import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingStatus } from "@prisma/client";

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: vi.fn(),
  },
}));

vi.mock("@/modules/bookings/services/transitionBookingStatus", () => ({
  applyBookingTransitionTx: vi.fn(),
}));

import { db } from "@/lib/db";
import { applyBookingTransitionTx } from "@/modules/bookings/services/transitionBookingStatus";
import { claimBooking } from "./claimBooking";

const BOOKING_ID = "booking-abc";
const DRIVER_ID = "driver-xyz";
const PROFILE_ID = "profile-xyz";

const FAKE_BOOKING = { id: BOOKING_ID, status: BookingStatus.CLAIMED } as never;

describe("claimBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ALREADY_CLAIMED when FOR UPDATE SKIP LOCKED returns no rows", async () => {
    vi.mocked(db.$transaction).mockImplementation((async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        $queryRaw: vi.fn().mockResolvedValue([]),
      };
      return fn(tx);
    }) as never);

    const result = await claimBooking({
      bookingId: BOOKING_ID,
      driverId: DRIVER_ID,
      byProfileId: PROFILE_ID,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ALREADY_CLAIMED");
    }
    expect(applyBookingTransitionTx).not.toHaveBeenCalled();
  });

  it("calls applyBookingTransitionTx with CLAIMED transition when lock succeeds", async () => {
    vi.mocked(applyBookingTransitionTx).mockResolvedValue(FAKE_BOOKING);

    vi.mocked(db.$transaction).mockImplementation((async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        $queryRaw: vi.fn().mockResolvedValue([
          { id: BOOKING_ID, status: "OPEN_FOR_CLAIM", version: 3 },
        ]),
      };
      return fn(tx);
    }) as never);

    const result = await claimBooking({
      bookingId: BOOKING_ID,
      driverId: DRIVER_ID,
      byProfileId: PROFILE_ID,
    });

    expect(result.ok).toBe(true);
    expect(applyBookingTransitionTx).toHaveBeenCalledOnce();
    expect(applyBookingTransitionTx).toHaveBeenCalledWith(
      expect.anything(),
      BOOKING_ID,
      {
        status: BookingStatus.OPEN_FOR_CLAIM,
        version: 3,
        assignedDriverId: null,
        assignedVehicleId: null,
      },
      {
        toStatus: BookingStatus.CLAIMED,
        byProfileId: PROFILE_ID,
        claimedByDriverId: DRIVER_ID,
        reason: "Driver claimed open booking",
      },
    );
  });

  it("applyBookingTransitionTx is called exactly once per claim (no double notification)", async () => {
    vi.mocked(applyBookingTransitionTx).mockResolvedValue(FAKE_BOOKING);

    vi.mocked(db.$transaction).mockImplementation((async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        $queryRaw: vi.fn().mockResolvedValue([
          { id: BOOKING_ID, status: "OPEN_FOR_CLAIM", version: 1 },
        ]),
      };
      return fn(tx);
    }) as never);

    await claimBooking({
      bookingId: BOOKING_ID,
      driverId: DRIVER_ID,
      byProfileId: PROFILE_ID,
    });

    expect(applyBookingTransitionTx).toHaveBeenCalledTimes(1);
  });
});
