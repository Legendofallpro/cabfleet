import { beforeEach, describe, expect, it, vi } from "vitest";
import { DriverStatus } from "@prisma/client";

vi.mock("@/lib/db", () => ({
  db: {
    driver: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { db } from "@/lib/db";
import { listAssignableDrivers } from "./list";

describe("listAssignableDrivers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.driver.findMany).mockResolvedValue([] as never);
    vi.mocked(db.driver.count).mockResolvedValue(0 as never);
  });

  it("filters to assignment-eligible drivers in the booking branch", async () => {
    await listAssignableDrivers({ branchId: "branch-blr", pageSize: 200 });

    expect(db.driver.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: null,
          status: { in: [DriverStatus.ACTIVE, DriverStatus.ON_LEAVE] },
          profile: { is: { branchId: "branch-blr" } },
        },
      }),
    );
    expect(db.driver.count).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        status: { in: [DriverStatus.ACTIVE, DriverStatus.ON_LEAVE] },
        profile: { is: { branchId: "branch-blr" } },
      },
    });
  });
});
