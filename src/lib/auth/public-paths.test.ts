import { describe, expect, it } from "vitest";

import { isPublicPath } from "./public-paths";

describe("isPublicPath", () => {
  it("allows the landing page by exact match only", () => {
    expect(isPublicPath("/")).toBe(true);
  });

  it("does not treat every path as public because of a / prefix", () => {
    expect(isPublicPath("/dashboard")).toBe(false);
    expect(isPublicPath("/bookings")).toBe(false);
    expect(isPublicPath("/portal")).toBe(false);
    expect(isPublicPath("/driver")).toBe(false);
  });

  it("allows auth and error entry paths", () => {
    expect(isPublicPath("/signin")).toBe(true);
    expect(isPublicPath("/signup")).toBe(true);
    expect(isPublicPath("/reset-password")).toBe(true);
    expect(isPublicPath("/set-password")).toBe(true);
    expect(isPublicPath("/claim-portal")).toBe(true);
    expect(isPublicPath("/error-404")).toBe(true);
    expect(isPublicPath("/auth-error")).toBe(true);
  });
});
