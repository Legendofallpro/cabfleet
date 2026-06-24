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
      include: { test: true },
    });
  });
});
