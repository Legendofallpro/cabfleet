import { beforeEach, describe, expect, it, vi } from "vitest";
import { DriverStatus, VehicleStatus } from "@prisma/client";

import { AppError } from "@/lib/errors";

vi.mock("@/lib/db", () => ({
  db: {
    booking: { findFirst: vi.fn() },
    driver: { findFirst: vi.fn() },
    vehicle: { findFirst: vi.fn() },
  },
}));

vi.mock("@/modules/bookings/services/transitionBookingStatus", () => ({
  transitionBookingStatus: vi.fn(),
  bookingDetailInclude: {},
}));

import { db } from "@/lib/db";
import { assignDriverToBooking } from "./booking.service";
import { transitionBookingStatus } from "@/modules/bookings/services/transitionBookingStatus";

describe("assignDriverToBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a driver from a different branch than the booking", async () => {
    vi.mocked(db.booking.findFirst).mockResolvedValue({
      id: "booking-1",
      branchId: "branch-blr",
    } as never);
    vi.mocked(db.driver.findFirst).mockResolvedValue({
      id: "driver-1",
      status: DriverStatus.ACTIVE,
      profile: { branchId: "branch-maa" },
    } as never);

    await expect(
      assignDriverToBooking(
        { bookingId: "booking-1", driverId: "driver-1", vehicleId: "vehicle-1" },
        { id: "staff-1" },
      ),
    ).rejects.toEqual(
      new AppError("VALIDATION", "Driver is not available for this booking.", {
        fieldErrors: { driverId: ["Driver must belong to the booking branch"] },
      }),
    );

    expect(transitionBookingStatus).not.toHaveBeenCalled();
  });

  it("rejects a vehicle from a different branch than the booking", async () => {
    vi.mocked(db.booking.findFirst).mockResolvedValue({
      id: "booking-1",
      branchId: "branch-blr",
    } as never);
    vi.mocked(db.driver.findFirst).mockResolvedValue({
      id: "driver-1",
      status: DriverStatus.ACTIVE,
      profile: { branchId: "branch-blr" },
    } as never);
    vi.mocked(db.vehicle.findFirst).mockResolvedValue({
      id: "vehicle-1",
      branchId: "branch-maa",
      status: VehicleStatus.AVAILABLE,
    } as never);

    await expect(
      assignDriverToBooking(
        { bookingId: "booking-1", driverId: "driver-1", vehicleId: "vehicle-1" },
        { id: "staff-1" },
      ),
    ).rejects.toEqual(
      new AppError("VALIDATION", "Vehicle is not available for this booking.", {
        fieldErrors: { vehicleId: ["Vehicle must belong to the booking branch"] },
      }),
    );

    expect(transitionBookingStatus).not.toHaveBeenCalled();
  });

  it("transitions the booking when both resources belong to the same branch", async () => {
    vi.mocked(db.booking.findFirst).mockResolvedValue({
      id: "booking-1",
      branchId: "branch-blr",
    } as never);
    vi.mocked(db.driver.findFirst).mockResolvedValue({
      id: "driver-1",
      status: DriverStatus.ACTIVE,
      profile: { branchId: "branch-blr" },
    } as never);
    vi.mocked(db.vehicle.findFirst).mockResolvedValue({
      id: "vehicle-1",
      branchId: "branch-blr",
      status: VehicleStatus.AVAILABLE,
    } as never);
    vi.mocked(transitionBookingStatus).mockResolvedValue({
      ok: true,
      data: { id: "booking-1" },
    } as never);

    const result = await assignDriverToBooking(
      { bookingId: "booking-1", driverId: "driver-1", vehicleId: "vehicle-1", reason: "Peak hour" },
      { id: "staff-1" },
    );

    expect(result).toEqual({ ok: true, data: { id: "booking-1" } });
    expect(transitionBookingStatus).toHaveBeenCalledWith("booking-1", {
      toStatus: "ASSIGNED",
      byProfileId: "staff-1",
      reason: "Peak hour",
      assignedDriverId: "driver-1",
      assignedVehicleId: "vehicle-1",
      assignedByStaffId: "staff-1",
    });
  });
});
