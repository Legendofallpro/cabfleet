import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";

const sessionState = vi.hoisted(() => ({
  user: null as null | {
    profile: { orgId: string | null; role: "ADMIN" | "SUPER_ADMIN" | "STAFF" | "CUSTOMER" | "DRIVER" };
  },
}));

const envState = vi.hoisted(() => ({
  NODE_ENV: "test" as "test" | "development" | "production",
  MULTI_ORG_ENABLED: false,
}));

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: vi.fn(async () => sessionState.user),
}));

vi.mock("@/lib/env", () => ({
  env: envState,
}));

import {
  currentOrgId,
  ensureOrgContext,
  orgIdFromContext,
  runWithOrg,
} from "@/lib/org-context";

describe("ensureOrgContext", () => {
  beforeEach(() => {
    sessionState.user = null;
    envState.NODE_ENV = "test";
    envState.MULTI_ORG_ENABLED = false;
  });

  afterEach(() => {
    sessionState.user = null;
  });

  it("returns ORG from the session orgId", async () => {
    sessionState.user = { profile: { orgId: "org-a", role: "ADMIN" } };
    const ctx = await ensureOrgContext();
    expect(ctx).toEqual({ mode: "ORG", orgId: "org-a" });
    expect(orgIdFromContext(ctx)).toBe("org-a");
  });

  it("returns BYPASS for SUPER_ADMIN with a null orgId", async () => {
    sessionState.user = { profile: { orgId: null, role: "SUPER_ADMIN" } };
    const ctx = await ensureOrgContext();
    expect(ctx).toEqual({ mode: "BYPASS", reason: "super_admin_session" });
    expect(orgIdFromContext(ctx)).toBeNull();
  });

  it("throws in production when there is no session", async () => {
    envState.NODE_ENV = "production";
    await expect(ensureOrgContext()).rejects.toEqual(
      expect.objectContaining({ code: "INTERNAL", message: "org context required" } satisfies Partial<AppError>),
    );
  });

  it("throws when MULTI_ORG_ENABLED even outside production", async () => {
    envState.MULTI_ORG_ENABLED = true;
    envState.NODE_ENV = "test";
    await expect(ensureOrgContext()).rejects.toMatchObject({ code: "INTERNAL" });
  });

  it("does not overwrite an explicit runWithOrg context", async () => {
    sessionState.user = { profile: { orgId: "org-b", role: "ADMIN" } };
    await runWithOrg("org-a", async () => {
      const ctx = await ensureOrgContext();
      expect(ctx).toEqual({ mode: "ORG", orgId: "org-a" });
      expect(currentOrgId()).toBe("org-a");
    });
  });
});
