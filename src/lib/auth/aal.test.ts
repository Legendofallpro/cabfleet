import { describe, expect, it } from "vitest";
import { isStaffMfaExemptPath, staffMustChallengeAal2 } from "./aal-paths";

describe("isStaffMfaExemptPath", () => {
  it("allows profile and account so staff can enroll", () => {
    expect(isStaffMfaExemptPath("/profile")).toBe(true);
    expect(isStaffMfaExemptPath("/profile/account")).toBe(true);
  });

  it("does not exempt the desk", () => {
    expect(isStaffMfaExemptPath("/")).toBe(false);
    expect(isStaffMfaExemptPath("/dashboard")).toBe(false);
    expect(isStaffMfaExemptPath("/bookings")).toBe(false);
  });
});

describe("staffMustChallengeAal2", () => {
  it("is off when STAFF_AAL2_REQUIRED is false", () => {
    expect(
      staffMustChallengeAal2({ aal: "aal1", pathname: "/bookings", required: false }),
    ).toBe(false);
  });

  it("bounces an empty pathname at aal1 (fail closed)", () => {
    expect(
      staffMustChallengeAal2({ aal: "aal1", pathname: "", required: true }),
    ).toBe(true);
  });

  it("bounces the desk at aal1 when required", () => {
    expect(
      staffMustChallengeAal2({ aal: "aal1", pathname: "/dashboard", required: true }),
    ).toBe(true);
  });

  it("allows account at aal1 when required", () => {
    expect(
      staffMustChallengeAal2({
        aal: "aal1",
        pathname: "/profile/account",
        required: true,
      }),
    ).toBe(false);
  });
});
