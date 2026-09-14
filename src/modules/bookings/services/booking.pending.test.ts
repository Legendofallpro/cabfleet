import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingStatus } from "@prisma/client";

import { AppError } from "@/lib/errors";

vi.mock("@/lib/db", () => ({
  db: {
    booking: { findFirst: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/audit", () => ({
  writeAudit: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/modules/pricing/services/fareCalculator", () => ({
  estimateFare: vi.fn(),
}));

vi.mock("@/modules/bookings/includes", () => ({
  bookingDetailInclude: {},
}));

vi.mock("@/modules/customers/services/customer.service", () => ({
  findOrCreateStaffCustomer: vi.fn(),
}));

vi.mock("@/modules/bookings/services/transitionBookingStatus", () => ({
  transitionBookingStatus: vi.fn(),
}));

vi.mock("@/modules/dispatch/services/resolveDispatchPolicy", () => ({
  resolveDispatchPolicy: vi.fn(),
}));

import { db } from "@/lib/db";
import { estimateFare } from "@/modules/pricing/services/fareCalculator";
import { updatePendingBooking } from "./booking.service";

const BASE_INPUT = {
  bookingId: "b1",
  pickupAt: new Date("2026-09-01T10:00:00+05:30"),
  pickupAddress: "A",
  dropAddress: "B",
  passengers: 2,
};

describe("updatePendingBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.$transaction).mockImplementation(async (fn) => fn(db));
    vi.mocked(db.booking.update).mockResolvedValue({
      id: "b1",
      pickupAt: BASE_INPUT.pickupAt,
      pickupAddress: "A",
      dropAddress: "B",
      fareEstimate: 500,
    } as never);
  });

  it("rejects edits when the booking is not PENDING", async () => {
    vi.mocked(db.booking.findFirst).mockResolvedValue({
      id: "b1",
      status: BookingStatus.ASSIGNED,
      branchId: "br1",
      bookingTypeId: "bt1",
      customer: { profileId: "p1" },
    } as never);

    await expect(
      updatePendingBooking(BASE_INPUT, { id: "staff-1" }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: "VALIDATION",
      } satisfies Partial<AppError>),
    );
    expect(db.booking.update).not.toHaveBeenCalled();
  });

  it("rejects a customer editing someone else's booking", async () => {
    vi.mocked(db.booking.findFirst).mockResolvedValue({
      id: "b1",
      status: BookingStatus.PENDING,
      branchId: "br1",
      bookingTypeId: "bt1",
      customer: { profileId: "owner" },
    } as never);

    await expect(
      updatePendingBooking(BASE_INPUT, { id: "other" }, { customerProfileId: "other" }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: "FORBIDDEN",
      } satisfies Partial<AppError>),
    );
  });

  it("does not overwrite fare fields on a customer edit", async () => {
    vi.mocked(db.booking.findFirst).mockResolvedValue({
      id: "b1",
      status: BookingStatus.PENDING,
      branchId: "br1",
      bookingTypeId: "bt1",
      customer: { profileId: "p1" },
    } as never);

    const result = await updatePendingBooking(
      { ...BASE_INPUT, quotedFare: 999, tollAmount: 50 },
      { id: "p1" },
      { customerProfileId: "p1" },
    );

    expect(result.ok).toBe(true);
    expect(estimateFare).not.toHaveBeenCalled();
    expect(db.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({
          fareEstimate: expect.anything(),
          tollAmount: expect.anything(),
        }),
      }),
    );
  });
});
