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

vi.mock("@/modules/geo/services/geocode", () => ({
  resolveBookingRoute: vi.fn(async () => ({
    pickupLat: null,
    pickupLng: null,
    dropLat: null,
    dropLng: null,
    distanceKm: null,
  })),
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
import { writeAudit } from "@/lib/audit";
import { grantLocationConsent } from "./booking.service";

const ACTOR = { id: "prof-cust", customerId: "cust-1" };

describe("grantLocationConsent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.$transaction).mockImplementation(async (fn) => fn(db));
  });

  it("returns NOT_FOUND when the booking is not the customer's", async () => {
    vi.mocked(db.booking.findFirst).mockResolvedValue(null);

    await expect(grantLocationConsent("bk-other", ACTOR)).rejects.toEqual(
      expect.objectContaining({ code: "NOT_FOUND" } satisfies Partial<AppError>),
    );
    expect(db.booking.update).not.toHaveBeenCalled();
  });

  it("rejects terminal bookings", async () => {
    vi.mocked(db.booking.findFirst).mockResolvedValue({
      id: "bk-1",
      status: BookingStatus.COMPLETED,
      locationConsentAt: null,
    } as never);

    await expect(grantLocationConsent("bk-1", ACTOR)).rejects.toEqual(
      expect.objectContaining({ code: "VALIDATION" } satisfies Partial<AppError>),
    );
    expect(db.booking.update).not.toHaveBeenCalled();
  });

  it("is idempotent when consent is already recorded", async () => {
    const when = new Date("2026-09-01T10:00:00Z");
    vi.mocked(db.booking.findFirst).mockResolvedValue({
      id: "bk-1",
      status: BookingStatus.ASSIGNED,
      locationConsentAt: when,
    } as never);

    const result = await grantLocationConsent("bk-1", ACTOR);
    expect(result.ok).toBe(true);
    expect(db.booking.update).not.toHaveBeenCalled();
    expect(writeAudit).not.toHaveBeenCalled();
  });

  it("stamps locationConsentAt and writes an UPDATE audit without changing status", async () => {
    vi.mocked(db.booking.findFirst).mockResolvedValue({
      id: "bk-1",
      status: BookingStatus.PENDING,
      locationConsentAt: null,
    } as never);
    vi.mocked(db.booking.update).mockResolvedValue({
      id: "bk-1",
      locationConsentAt: new Date(),
    } as never);

    const result = await grantLocationConsent("bk-1", ACTOR);
    expect(result.ok).toBe(true);
    expect(db.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "bk-1" },
        data: expect.objectContaining({
          locationConsentAt: expect.any(Date),
        }),
      }),
    );
    const updateArg = vi.mocked(db.booking.update).mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(updateArg.data).not.toHaveProperty("status");
    expect(writeAudit).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        entity: "Booking",
        entityId: "bk-1",
        action: "UPDATE",
        byProfileId: ACTOR.id,
      }),
    );
  });
});
