import { describe, expect, it } from "vitest";

import {
  resetPasswordRequestSchema,
  setPasswordSchema,
  signUpSchema,
} from "@/lib/auth/validators";

describe("resetPasswordRequestSchema", () => {
  it("accepts a valid email address", () => {
    const parsed = resetPasswordRequestSchema.safeParse({ email: "driver@example.com" });

    expect(parsed.success).toBe(true);
  });

  it("rejects an invalid email address", () => {
    const parsed = resetPasswordRequestSchema.safeParse({ email: "driver" });

    expect(parsed.success).toBe(false);
  });
});

describe("setPasswordSchema", () => {
  it("accepts matching passwords with the required length", () => {
    const parsed = setPasswordSchema.safeParse({
      password: "password123",
      confirmPassword: "password123",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects passwords shorter than eight characters", () => {
    const parsed = setPasswordSchema.safeParse({
      password: "short",
      confirmPassword: "short",
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects mismatched confirmation values", () => {
    const parsed = setPasswordSchema.safeParse({
      password: "password123",
      confirmPassword: "different123",
    });

    expect(parsed.success).toBe(false);
  });
});

describe("signUpSchema", () => {
  const valid = {
    firstName: "Priya",
    lastName: "Nair",
    phone: "9876543210",
    email: "priya@gmail.com",
    password: "password1",
    agreed: true as const,
  };

  it("accepts name, Indian mobile, email, and password", () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a non-Indian mobile", () => {
    expect(signUpSchema.safeParse({ ...valid, phone: "123" }).success).toBe(false);
  });

  it("rejects .invalid emails", () => {
    expect(
      signUpSchema.safeParse({ ...valid, email: "x@staff.cabfleet.invalid" }).success,
    ).toBe(false);
  });
});
