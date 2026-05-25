import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    branch: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/audit", () => ({
  writeAudit: vi.fn(),
}));

import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { softDeleteBranch } from "./branch.service";

describe("softDeleteBranch", () => {
  const tx = {
    branch: { update: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.branch.findFirst).mockResolvedValue({
      id: "branch-1",
      code: "BLR-01",
    } as never);
    vi.mocked(db.$transaction).mockImplementation(
      async (fn: Parameters<typeof db.$transaction>[0]) => fn(tx as never),
    );
  });

  it("releases the branch code while soft deleting", async () => {
    await softDeleteBranch("branch-1", { id: "actor-1" });

    expect(tx.branch.update).toHaveBeenCalledWith({
      where: { id: "branch-1" },
      data: expect.objectContaining({
        active: false,
        deletedAt: expect.any(Date),
        code: "BLR-01__deleted__branch-1",
      }),
    });
    expect(writeAudit).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        action: "DELETE",
        entity: "Branch",
        entityId: "branch-1",
        byProfileId: "actor-1",
        diff: {
          before: { code: "BLR-01" },
          after: { code: "BLR-01__deleted__branch-1" },
        },
      }),
    );
  });
});
