import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    staff: { findFirst: vi.fn() },
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
import { softDeleteStaff } from "./staff.service";

describe("softDeleteStaff", () => {
  const tx = {
    staff: { update: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.staff.findFirst).mockResolvedValue({
      id: "staff-1",
      employeeId: "EMP-001",
    } as never);
    vi.mocked(db.$transaction).mockImplementation(
      async (fn: Parameters<typeof db.$transaction>[0]) => fn(tx as never),
    );
  });

  it("releases the employee ID while soft deleting", async () => {
    await softDeleteStaff("staff-1", { id: "actor-1" });

    expect(tx.staff.update).toHaveBeenCalledWith({
      where: { id: "staff-1" },
      data: expect.objectContaining({
        deletedAt: expect.any(Date),
        status: "INACTIVE",
        employeeId: "EMP-001__deleted__staff-1",
      }),
    });
    expect(writeAudit).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        action: "DELETE",
        entity: "Staff",
        entityId: "staff-1",
        byProfileId: "actor-1",
        diff: {
          before: { employeeId: "EMP-001" },
          after: { employeeId: "EMP-001__deleted__staff-1" },
        },
      }),
    );
  });
});
