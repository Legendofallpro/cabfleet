import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingStatus } from "@prisma/client";

vi.mock("@/lib/db", () => ({
  db: {
    booking: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/modules/bookings/includes", () => ({
  bookingDetailInclude: { test: true },
  openClaimBookingInclude: { open: true },
}));

import { db } from "@/lib/db";
import { getDriverBookingDetail } from "./driver";

describe("getDriverBookingDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.booking.findFirst).mockResolvedValue(null as never);
  });

  it("only exposes open trips when they belong to the driver's branch", async () => {
    await getDriverBookingDetail("booking-1", {
      driverId: "driver-1",
      branchId: "branch-blr",
    });

    expect(db.booking.findFirst).toHaveBeenCalledWith({
      where: {
        id: "booking-1",
        deletedAt: null,
        OR: [
          {
            status: BookingStatus.OPEN_FOR_CLAIM,
            branchId: "branch-blr",
          },
          { claimedByDriverId: "driver-1" },
          { assignedDriverId: "driver-1" },
        ],
      },
      select: {
        id: true,
        status: true,
        claimedByDriverId: true,
        assignedDriverId: true,
      },
    });
  });

  it("loads full PII includes only for owned trips", async () => {
    vi.mocked(db.booking.findFirst)
      .mockResolvedValueOnce({
        id: "booking-1",
        status: BookingStatus.CLAIMED,
        claimedByDriverId: "driver-1",
        assignedDriverId: null,
      } as never)
      .mockResolvedValueOnce(null as never);

    await getDriverBookingDetail("booking-1", {
      driverId: "driver-1",
      branchId: "branch-blr",
    });

    expect(db.booking.findFirst).toHaveBeenNthCalledWith(2, {
      where: { id: "booking-1", deletedAt: null },
      include: { test: true },
    });
  });

  it("uses the open-claim include when the driver does not own the trip", async () => {
    vi.mocked(db.booking.findFirst)
      .mockResolvedValueOnce({
        id: "booking-1",
        status: BookingStatus.OPEN_FOR_CLAIM,
        claimedByDriverId: null,
        assignedDriverId: null,
      } as never)
      .mockResolvedValueOnce(null as never);

    await getDriverBookingDetail("booking-1", {
      driverId: "driver-1",
      branchId: "branch-blr",
    });

    expect(db.booking.findFirst).toHaveBeenNthCalledWith(2, {
      where: { id: "booking-1", deletedAt: null },
      include: { open: true },
    });
  });
});
