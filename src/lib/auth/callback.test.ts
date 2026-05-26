import { describe, expect, it } from "vitest";

import {
  getCallbackPasswordMode,
  getCallbackRedirect,
  getSetPasswordMode,
  normalizeRedirectParam,
} from "@/lib/auth/callback";

describe("getCallbackPasswordMode", () => {
  it("prefers invite mode for invite callbacks", () => {
    expect(getCallbackPasswordMode("invite", null)).toBe("invite");
  });

  it("uses recovery mode for recovery callbacks", () => {
    expect(getCallbackPasswordMode("recovery", null)).toBe("recovery");
  });

  it("accepts an explicit mode override", () => {
    expect(getCallbackPasswordMode(null, "invite")).toBe("invite");
  });

  it("returns null for non-password flows", () => {
    expect(getCallbackPasswordMode("magiclink", null)).toBeNull();
  });
});

describe("getCallbackRedirect", () => {
  it("routes invite callbacks to the set-password screen", () => {
    expect(getCallbackRedirect({ type: "invite", mode: null, next: "/driver" })).toBe(
      "/set-password?mode=invite",
    );
  });

  it("routes recovery callbacks to the set-password screen", () => {
    expect(getCallbackRedirect({ type: "recovery", mode: null, next: "/portal" })).toBe(
      "/set-password?mode=recovery",
    );
  });

  it("keeps a role-safe destination for normal callbacks", () => {
    expect(
      getCallbackRedirect({
        type: "magiclink",
        mode: null,
        next: "/portal/book",
        role: "CUSTOMER",
      }),
    ).toBe("/portal/book");
  });

  it("falls back to role home when the destination is unsafe for the role", () => {
    expect(
      getCallbackRedirect({
        type: "magiclink",
        mode: null,
        next: "/portal/book",
        role: "DRIVER",
      }),
    ).toBe("/driver");
  });

  it("falls back to role home when no next is provided", () => {
    expect(
      getCallbackRedirect({
        type: "magiclink",
        mode: null,
        next: null,
        role: "CUSTOMER",
      }),
    ).toBe("/portal");
  });

  it("uses redirect_to as a fallback when next is absent", () => {
    expect(
      getCallbackRedirect({
        type: "magiclink",
        mode: null,
        next: null,
        redirectTo: "/portal/book",
        role: "CUSTOMER",
      }),
    ).toBe("/portal/book");
  });

  it("prefers next over redirect_to when both are present", () => {
    expect(
      getCallbackRedirect({
        type: "magiclink",
        mode: null,
        next: "/portal/trips",
        redirectTo: "/portal/book",
        role: "CUSTOMER",
      }),
    ).toBe("/portal/trips");
  });
});

describe("getSetPasswordMode", () => {
  it("accepts invite and recovery modes", () => {
    expect(getSetPasswordMode("invite")).toBe("invite");
    expect(getSetPasswordMode("recovery")).toBe("recovery");
  });

  it("rejects missing or invalid modes", () => {
    expect(getSetPasswordMode(undefined)).toBeNull();
    expect(getSetPasswordMode("magiclink")).toBeNull();
  });
});

describe("normalizeRedirectParam", () => {
  it("returns next when valid", () => {
    expect(normalizeRedirectParam("/portal/book", null)).toBe("/portal/book");
  });

  it("falls back to redirect_to when next is null", () => {
    expect(normalizeRedirectParam(null, "/driver/home")).toBe("/driver/home");
  });

  it("returns null when both are null", () => {
    expect(normalizeRedirectParam(null, null)).toBeNull();
  });

  it("rejects external redirect_to", () => {
    expect(normalizeRedirectParam(null, "https://evil.com")).toBeNull();
  });

  it("rejects an invalid next and falls back to redirect_to", () => {
    expect(normalizeRedirectParam("https://evil.com", "/portal")).toBe("/portal");
  });
});
