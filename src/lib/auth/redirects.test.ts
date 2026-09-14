import { describe, expect, it } from "vitest";

import {
  getPostAuthRedirect,
  getRoleHome,
  sanitizeRedirectTo,
} from "@/lib/auth/redirects";

describe("getRoleHome", () => {
  it("returns the correct home path for each role", () => {
    expect(getRoleHome("ADMIN")).toBe("/dashboard");
    expect(getRoleHome("STAFF")).toBe("/dashboard");
    expect(getRoleHome("SUPER_ADMIN")).toBe("/dashboard");
    expect(getRoleHome("DRIVER")).toBe("/driver");
    expect(getRoleHome("CUSTOMER")).toBe("/portal");
  });
});

describe("sanitizeRedirectTo", () => {
  it("keeps app-local paths", () => {
    expect(sanitizeRedirectTo("/portal/book?tab=upcoming")).toBe("/portal/book?tab=upcoming");
  });

  it("rejects empty or external redirect targets", () => {
    expect(sanitizeRedirectTo(undefined)).toBeNull();
    expect(sanitizeRedirectTo("")).toBeNull();
    expect(sanitizeRedirectTo("https://example.com")).toBeNull();
    expect(sanitizeRedirectTo("//example.com")).toBeNull();
    expect(sanitizeRedirectTo("portal/book")).toBeNull();
  });

  it("rejects protocol-relative and encoded slash open-redirects", () => {
    expect(sanitizeRedirectTo("/\\evil.com")).toBeNull();
    expect(sanitizeRedirectTo("/\\\\evil.com")).toBeNull();
    expect(sanitizeRedirectTo("/%2fevil.com")).toBeNull();
    expect(sanitizeRedirectTo("/%2Fevil.com")).toBeNull();
    expect(sanitizeRedirectTo("/@evil.com")).toBeNull();
  });

  it("rejects auth entry paths to avoid redirect loops", () => {
    expect(sanitizeRedirectTo("/signin")).toBeNull();
    expect(sanitizeRedirectTo("/signin?redirectTo=/portal")).toBeNull();
    expect(sanitizeRedirectTo("/signup")).toBeNull();
    expect(sanitizeRedirectTo("/reset-password")).toBeNull();
    expect(sanitizeRedirectTo("/set-password?mode=recovery")).toBeNull();
    expect(sanitizeRedirectTo("/set-password")).toBeNull();
    expect(sanitizeRedirectTo("/auth/callback")).toBeNull();
  });
});

describe("getPostAuthRedirect — segment-aware role checks", () => {
  it("keeps a safe customer redirect to /portal", () => {
    expect(getPostAuthRedirect("/portal", "CUSTOMER")).toBe("/portal");
  });

  it("keeps a safe customer redirect to a /portal/ sub-path", () => {
    expect(getPostAuthRedirect("/portal/book", "CUSTOMER")).toBe("/portal/book");
  });

  it("blocks a customer redirect to /portalfoo (non-segment match)", () => {
    expect(getPostAuthRedirect("/portalfoo", "CUSTOMER")).toBe("/portal");
  });

  it("blocks a driver redirect to /driverextra (non-segment match)", () => {
    expect(getPostAuthRedirect("/driverextra", "DRIVER")).toBe("/driver");
  });

  it("keeps a safe driver redirect to /driver", () => {
    expect(getPostAuthRedirect("/driver", "DRIVER")).toBe("/driver");
  });

  it("keeps a safe driver redirect to a /driver/ sub-path", () => {
    expect(getPostAuthRedirect("/driver/trips", "DRIVER")).toBe("/driver/trips");
  });

  it("falls back to role home when redirect target is unsafe for the role", () => {
    expect(getPostAuthRedirect("/portal", "DRIVER")).toBe("/driver");
    expect(getPostAuthRedirect("/driver", "CUSTOMER")).toBe("/portal");
    expect(getPostAuthRedirect("/profile", "DRIVER")).toBe("/driver");
  });

  it("allows admin and staff to return to admin-side paths", () => {
    expect(getPostAuthRedirect("/profile", "ADMIN")).toBe("/profile");
    expect(getPostAuthRedirect("/payments/123", "STAFF")).toBe("/payments/123");
  });

  it("blocks admin and staff from /portal or /driver paths", () => {
    expect(getPostAuthRedirect("/portal/book", "ADMIN")).toBe("/dashboard");
    expect(getPostAuthRedirect("/driver/trips", "STAFF")).toBe("/dashboard");
  });

  it("falls back to role home when redirect target is missing", () => {
    expect(getPostAuthRedirect(undefined, "CUSTOMER")).toBe("/portal");
    expect(getPostAuthRedirect(null, "DRIVER")).toBe("/driver");
    expect(getPostAuthRedirect(null, "ADMIN")).toBe("/dashboard");
  });

  it("treats / as role home so the public landing is never a post-auth destination", () => {
    expect(getPostAuthRedirect("/", "ADMIN")).toBe("/dashboard");
    expect(getPostAuthRedirect("/", "CUSTOMER")).toBe("/portal");
    expect(getPostAuthRedirect("/", "DRIVER")).toBe("/driver");
  });

  it("keeps staff on the desk after sign-in", () => {
    expect(getPostAuthRedirect("/dashboard", "STAFF")).toBe("/dashboard");
  });
});
