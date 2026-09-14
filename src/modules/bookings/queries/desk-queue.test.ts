import { BookingStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { partitionDeskQueue } from "./desk-queue";

function row(
  overrides: Partial<{
    id: string;
    status: BookingStatus;
    assignedVehicleId: string | null;
    fareEstimate: number | null;
    fareFinal: number | null;
    tollAmount: number;
    parkingAmount: number;
    captured: number;
  }>,
) {
  const captured = overrides.captured ?? 0;
  return {
    id: overrides.id ?? "b1",
    status: overrides.status ?? BookingStatus.PENDING,
    pickupAt: new Date("2026-09-14T10:00:00Z"),
    pickupAddress: "A",
    dropAddress: "B",
    fareEstimate: overrides.fareEstimate ?? 500,
    fareFinal: overrides.fareFinal ?? null,
    tollAmount: overrides.tollAmount ?? 0,
    parkingAmount: overrides.parkingAmount ?? 0,
    assignedVehicleId: overrides.assignedVehicleId ?? null,
    customer: { profile: { fullName: "Aman" } },
    payments: captured > 0 ? [{ amount: captured }] : [],
  };
}

describe("partitionDeskQueue", () => {
  it("puts PENDING and CLAIMED in needs-assign, and flags claimed without a vehicle", () => {
    const out = partitionDeskQueue([
      row({ id: "p", status: BookingStatus.PENDING }),
      row({ id: "c", status: BookingStatus.CLAIMED, assignedVehicleId: null }),
    ]);
    expect(out.needsAssign.map((r) => r.id)).toEqual(["p", "c"]);
    expect(out.needsAssign.find((r) => r.id === "c")?.needsVehicle).toBe(true);
  });

  it("splits open-for-claim and active trips", () => {
    const out = partitionDeskQueue([
      row({ id: "o", status: BookingStatus.OPEN_FOR_CLAIM }),
      row({ id: "a", status: BookingStatus.ASSIGNED }),
      row({ id: "e", status: BookingStatus.DRIVER_EN_ROUTE }),
    ]);
    expect(out.openForClaim.map((r) => r.id)).toEqual(["o"]);
    expect(out.active.map((r) => r.id)).toEqual(["a", "e"]);
  });

  it("lists completed trips that still have unpaid fare", () => {
    const out = partitionDeskQueue([
      row({ id: "paid", status: BookingStatus.COMPLETED, fareFinal: 400, captured: 400 }),
      row({ id: "due", status: BookingStatus.COMPLETED, fareFinal: 400, captured: 0 }),
    ]);
    expect(out.unpaidCompleted.map((r) => r.id)).toEqual(["due"]);
  });

  it("does not add toll/parking again when fareFinal already includes them", () => {
    const out = partitionDeskQueue([
      row({
        id: "paid-extras",
        status: BookingStatus.COMPLETED,
        fareFinal: 450,
        tollAmount: 40,
        parkingAmount: 10,
        captured: 450,
      }),
    ]);
    expect(out.unpaidCompleted.map((r) => r.id)).toEqual([]);
  });
});
