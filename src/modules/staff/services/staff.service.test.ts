import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    branch: { findFirst: vi.fn() },
    staff: { findFirst: vi.fn(), findUnique: vi.fn() },
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

vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  },
}));

import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { inviteStaff, softDeleteStaff } from "./staff.service";

const inviteUserByEmail = vi.fn();

describe("inviteStaff", () => {
  const tx = {
    profile: { upsert: vi.fn() },
    staff: { create: vi.fn(), update: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.branch.findFirst).mockResolvedValue({ id: "branch-1" } as never);
    vi.mocked(db.staff.findUnique).mockResolvedValue(null);
    vi.mocked(getSupabaseAdminClient).mockReturnValue({
      auth: {
        admin: {
          inviteUserByEmail,
        },
      },
    } as never);
    inviteUserByEmail.mockResolvedValue({
      data: { user: { id: "auth-user-1" } },
      error: null,
    });
    tx.staff.create.mockResolvedValue({ id: "staff-1" } as never);
    vi.mocked(db.$transaction).mockImplementation(
      async (fn: Parameters<typeof db.$transaction>[0]) => fn(tx as never),
    );
  });

  it("passes the auth callback URL when inviting staff", async () => {
    await inviteStaff(
      {
        email: "staff@example.com",
        fullName: "Staff Example",
        phone: "9876543210",
        branchId: "branch-1",
        employeeId: "EMP-123",
        designation: "SUPPORT",
        status: "ACTIVE",
        role: "STAFF",
        notes: null,
      },
      { id: "actor-1" },
    );

    expect(inviteUserByEmail).toHaveBeenCalledWith(
      "staff@example.com",
      expect.objectContaining({
        redirectTo: "http://localhost:3000/auth/callback?mode=invite",
      }),
    );
  });
});

describe("softDeleteStaff", () => {
  const tx = {
    profile: { upsert: vi.fn() },
    staff: { create: vi.fn(), update: vi.fn() },
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
