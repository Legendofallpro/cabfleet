import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";

const { envState } = vi.hoisted(() => ({
  envState: { SETUP_SECRET: undefined as string | undefined },
}));

vi.mock("@/lib/db", () => ({
  db: {
    installSettings: { findUnique: vi.fn() },
    branch: { findFirst: vi.fn() },
    organization: { findFirst: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/audit", () => ({
  writeAudit: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  env: envState,
}));

vi.mock("@/lib/org-context", () => ({
  runWithoutOrg: (_reason: string, fn: () => Promise<unknown>) => fn(),
}));

import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { completeSetup } from "./install.service";

const baseInput = {
  country: "IN",
  currency: "INR",
  locale: "en-IN",
  timezone: "Asia/Kolkata",
  phoneRegion: "IN",
  taxIdLabel: "GSTIN",
  taxRate: 18,
};

describe("completeSetup", () => {
  const tx = {
    installSettings: { upsert: vi.fn() },
    branch: { update: vi.fn() },
    organization: { update: vi.fn() },
  };

  const upsertedRow = {
    id: "default",
    ...baseInput,
    setupCompletedAt: new Date("2026-01-01"),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    envState.SETUP_SECRET = undefined;

    vi.mocked(db.installSettings.findUnique).mockResolvedValue(null);
    vi.mocked(db.branch.findFirst).mockResolvedValue({
      id: "branch-hq",
      code: "HQ",
      timezone: "UTC",
    } as never);
    vi.mocked(db.organization.findFirst).mockResolvedValue({
      id: "org-default",
      slug: "default",
      gstRate: 0,
    } as never);
    vi.mocked(db.$transaction).mockImplementation(
      async (fn: Parameters<typeof db.$transaction>[0]) => fn(tx as never),
    );
    tx.installSettings.upsert.mockResolvedValue(upsertedRow);
    tx.branch.update.mockResolvedValue({} as never);
    tx.organization.update.mockResolvedValue({} as never);
  });

  it("first upsert writes audit CREATE and updates HQ timezone when UTC", async () => {
    const result = await completeSetup(baseInput, { id: null });

    expect(result.ok).toBe(true);
    expect(tx.installSettings.upsert).toHaveBeenCalledWith({
      where: { id: "default" },
      create: expect.objectContaining({
        ...baseInput,
        setupCompletedAt: expect.any(Date),
      }),
      update: expect.objectContaining({
        ...baseInput,
        setupCompletedAt: expect.any(Date),
      }),
    });
    expect(writeAudit).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        action: "CREATE",
        entity: "InstallSettings",
        entityId: "default",
        byProfileId: null,
      }),
    );
    expect(tx.branch.update).toHaveBeenCalledWith({
      where: { id: "branch-hq" },
      data: { timezone: "Asia/Kolkata" },
    });
    expect(tx.organization.update).toHaveBeenCalledWith({
      where: { id: "org-default" },
      data: { gstRate: 18 },
    });
  });

  it("second call with actor.id === null throws CONFLICT", async () => {
    vi.mocked(db.installSettings.findUnique).mockResolvedValue({
      id: "default",
      setupCompletedAt: new Date("2025-06-01"),
    } as never);

    await expect(completeSetup(baseInput, { id: null })).rejects.toEqual(
      expect.objectContaining({
        code: "CONFLICT",
        message: "Setup already completed.",
      } satisfies Partial<AppError>),
    );
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("SETUP_SECRET set and wrong secret → FORBIDDEN", async () => {
    envState.SETUP_SECRET = "super-secret";

    await expect(
      completeSetup({ ...baseInput, setupSecret: "wrong" }, { id: null }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: "FORBIDDEN",
        message: "Invalid setup secret.",
      } satisfies Partial<AppError>),
    );
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("SETUP_SECRET set and correct secret → succeeds", async () => {
    envState.SETUP_SECRET = "super-secret";

    const result = await completeSetup(
      { ...baseInput, setupSecret: "super-secret" },
      { id: null },
    );

    expect(result.ok).toBe(true);
    expect(db.$transaction).toHaveBeenCalled();
  });
});
