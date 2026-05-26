import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    branch: { findFirst: vi.fn() },
    driver: { findFirst: vi.fn(), findUnique: vi.fn() },
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
import { inviteDriver, softDeleteDriver } from "./driver.service";

const inviteUserByEmail = vi.fn();

describe("inviteDriver", () => {
  const tx = {
    profile: { upsert: vi.fn() },
    driver: { create: vi.fn(), update: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.branch.findFirst).mockResolvedValue({ id: "branch-1" } as never);
    vi.mocked(db.driver.findUnique).mockResolvedValue(null);
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
    tx.driver.create.mockResolvedValue({ id: "driver-1" } as never);
    vi.mocked(db.$transaction).mockImplementation(
      async (fn: Parameters<typeof db.$transaction>[0]) => fn(tx as never),
    );
  });

  it("passes the auth callback URL when inviting drivers", async () => {
    await inviteDriver(
      {
        email: "driver@example.com",
        fullName: "Driver Example",
        phone: "9876543210",
        branchId: "branch-1",
        licenseNumber: "DL-12345",
        licenseExpiry: new Date("2030-01-01"),
        status: "ACTIVE",
        verification: "PENDING",
        notes: null,
      },
      { id: "actor-1" },
    );

    expect(inviteUserByEmail).toHaveBeenCalledWith(
      "driver@example.com",
      expect.objectContaining({
        redirectTo: "http://localhost:3000/auth/callback?mode=invite",
      }),
    );
  });
});

describe("softDeleteDriver", () => {
  const tx = {
    profile: { upsert: vi.fn() },
    driver: { create: vi.fn(), update: vi.fn() },
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
