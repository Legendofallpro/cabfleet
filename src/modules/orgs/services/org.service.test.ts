import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";

vi.mock("@/lib/db", () => ({
  db: {
    organization: { findFirst: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/audit", () => ({
  writeAudit: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/lib/env", () => ({
  env: { NODE_ENV: "test" },
}));

vi.mock("@/lib/org-context", () => ({
  runWithoutOrg: (_reason: string, fn: () => Promise<unknown>) => fn(),
}));

import { db } from "@/lib/db";
import { updateOrgGst } from "./org.service";

describe("updateOrgGst", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forbids a tenant admin from editing another org", async () => {
    await expect(
      updateOrgGst(
        { orgId: "org-b", gstin: "", gstRate: 0 },
        { id: "admin-1", role: "ADMIN", orgId: "org-a" },
      ),
    ).rejects.toEqual(
      expect.objectContaining({ code: "FORBIDDEN" } satisfies Partial<AppError>),
    );
    expect(db.organization.findFirst).not.toHaveBeenCalled();
  });
});
