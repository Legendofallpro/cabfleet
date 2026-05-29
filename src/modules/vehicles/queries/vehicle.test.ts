import { beforeEach, describe, expect, it, vi } from "vitest";
import { VehicleStatus } from "@prisma/client";

vi.mock("@/lib/db", () => ({
  db: {
    vehicle: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { db } from "@/lib/db";
import { listAssignableVehicles } from "./vehicle";

describe("listAssignableVehicles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.vehicle.findMany).mockResolvedValue([] as never);
    vi.mocked(db.vehicle.count).mockResolvedValue(0 as never);
  });

  it("filters to assignment-eligible vehicles in the booking branch", async () => {
    await listAssignableVehicles({ branchId: "branch-blr", pageSize: 200 });

    expect(db.vehicle.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: null,
          branchId: "branch-blr",
          status: { in: [VehicleStatus.AVAILABLE, VehicleStatus.ON_TRIP] },
        },
      }),
    );
    expect(db.vehicle.count).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        branchId: "branch-blr",
        status: { in: [VehicleStatus.AVAILABLE, VehicleStatus.ON_TRIP] },
      },
    });
  });
});
