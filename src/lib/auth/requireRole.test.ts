import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";
import { PERMISSIONS } from "@/lib/auth/permissions";

const aalState = vi.hoisted(() => ({ level: "aal1" as "aal1" | "aal2" }));
const envState = vi.hoisted(() => ({ STAFF_AAL2_REQUIRED: true }));
const sessionState = vi.hoisted(() => ({
  session: {
    authId: "auth-1",
    email: "staff@example.com",
    profile: {
      id: "prof-1",
      role: "STAFF" as "SUPER_ADMIN" | "ADMIN" | "STAFF" | "DRIVER" | "CUSTOMER",
      orgId: "org-1",
    },
  },
}));

vi.mock("@/lib/auth/aal", () => ({
  getCurrentAal: vi.fn(async () => aalState.level),
}));

vi.mock("@/lib/env", () => ({
  env: envState,
}));

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: vi.fn(async () => sessionState.session),
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

import { requirePermission, requireRole } from "./requireRole";

describe("requirePermission AAL2", () => {
  beforeEach(() => {
    aalState.level = "aal1";
    envState.STAFF_AAL2_REQUIRED = true;
    sessionState.session.profile.role = "STAFF";
  });

  it("rejects staff mutations at aal1", async () => {
    await expect(requirePermission(PERMISSIONS.PAYMENT_MANAGE)).rejects.toEqual(
      expect.objectContaining({ code: "FORBIDDEN" } satisfies Partial<AppError>),
    );
  });

  it("allows staff mutations at aal2", async () => {
    aalState.level = "aal2";
    const session = await requirePermission(PERMISSIONS.PAYMENT_MANAGE);
    expect(session.profile.id).toBe("prof-1");
  });

  it("allows aal1 when allowAal1 is set", async () => {
    const session = await requireRole(["STAFF"], { allowAal1: true });
    expect(session.profile.role).toBe("STAFF");
  });

  it("does not require aal2 for customers", async () => {
    sessionState.session.profile.role = "CUSTOMER";
    const session = await requireRole(["CUSTOMER"]);
    expect(session.profile.role).toBe("CUSTOMER");
  });
});
