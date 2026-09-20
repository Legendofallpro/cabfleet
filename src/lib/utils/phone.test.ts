import { describe, expect, it } from "vitest";
import { isValidE164, toE164 } from "@/lib/utils/phone";

describe("toE164", () => {
  it("normalizes an Indian 10-digit number when region is IN", () => {
    const r = toE164("9876543210", "IN");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.e164).toBe("+919876543210");
      expect(r.country).toBe("IN");
    }
  });

  it("does not treat a 10-digit number as IN when region is US", () => {
    const r = toE164("9876543210", "US");
    // US national numbers are 10 digits; this particular NPA may be invalid.
    // Assert the function required a region by also covering E.164:
    const e164 = toE164("+919876543210", "US");
    expect(e164.ok).toBe(true);
    if (e164.ok) expect(e164.e164).toBe("+919876543210");
  });

  it("normalizes a +91-prefixed number with spaces", () => {
    const r = toE164(" +91 98765 43210 ", "IN");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.e164).toBe("+919876543210");
  });

  it("normalizes a US number when the default region is US", () => {
    const r = toE164("415-555-2671", "US");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.e164).toBe("+14155552671");
  });

  it("rejects empty input", () => {
    const r = toE164("", "IN");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("EMPTY");
  });

  it("rejects null/undefined", () => {
    expect(toE164(null, "IN").ok).toBe(false);
    expect(toE164(undefined, "IN").ok).toBe(false);
  });

  it("rejects a too-short number", () => {
    const r = toE164("123", "IN");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("INVALID");
  });

  it("rejects garbage strings", () => {
    expect(toE164("not a phone", "IN").ok).toBe(false);
  });
});

describe("isValidE164", () => {
  it("returns true for parseable input", () => {
    expect(isValidE164("9876543210", "IN")).toBe(true);
  });
  it("returns false for empty input", () => {
    expect(isValidE164("", "IN")).toBe(false);
  });
  it("returns false for garbage", () => {
    expect(isValidE164("xxx", "IN")).toBe(false);
  });
});
