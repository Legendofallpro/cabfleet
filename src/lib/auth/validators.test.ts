import { describe, expect, it } from "vitest";

import {
  resetPasswordRequestSchema,
  setPasswordSchema,
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
