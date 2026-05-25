import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    driver: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/audit", () => ({
  writeAudit: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { softDeleteDriver } from "./driver.service";

describe("softDeleteDriver", () => {
  const tx = {
    driver: { update: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.driver.findFirst).mockResolvedValue({
      id: "driver-1",
      licenseNumber: "DL-12345",
    } as never);
    vi.mocked(db.$transaction).mockImplementation(
      async (fn: Parameters<typeof db.$transaction>[0]) => fn(tx as never),
    );
  });

  it("releases the license number while soft deleting", async () => {
    await softDeleteDriver("driver-1", { id: "actor-1" });

    expect(tx.driver.update).toHaveBeenCalledWith({
      where: { id: "driver-1" },
      data: expect.objectContaining({
        deletedAt: expect.any(Date),
        status: "INACTIVE",
        licenseNumber: "DL-12345__deleted__driver-1",
      }),
    });
    expect(writeAudit).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        action: "DELETE",
        entity: "Driver",
        entityId: "driver-1",
        byProfileId: "actor-1",
        diff: {
          before: { licenseNumber: "DL-12345" },
          after: { licenseNumber: "DL-12345__deleted__driver-1" },
        },
      }),
    );
  });
});
