import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    vehicle: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/audit", () => ({
  writeAudit: vi.fn(),
}));

import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { softDeleteVehicle } from "./vehicle.service";

describe("softDeleteVehicle", () => {
  const tx = {
    vehicle: { update: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.vehicle.findFirst).mockResolvedValue({
      id: "vehicle-1",
      registrationNumber: "KA01AB1234",
    } as never);
    vi.mocked(db.$transaction).mockImplementation(
      async (fn: Parameters<typeof db.$transaction>[0]) => fn(tx as never),
    );
  });

  it("releases the registration number while soft deleting", async () => {
    await softDeleteVehicle("vehicle-1", { id: "actor-1" });

    expect(tx.vehicle.update).toHaveBeenCalledWith({
      where: { id: "vehicle-1" },
      data: expect.objectContaining({
        deletedAt: expect.any(Date),
        status: "INACTIVE",
        registrationNumber: "KA01AB1234__deleted__vehicle-1",
      }),
    });
    expect(writeAudit).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        action: "DELETE",
        entity: "Vehicle",
        entityId: "vehicle-1",
        byProfileId: "actor-1",
        diff: {
          before: { registrationNumber: "KA01AB1234" },
          after: { registrationNumber: "KA01AB1234__deleted__vehicle-1" },
        },
      }),
    );
  });
});
