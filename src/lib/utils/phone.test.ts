import { describe, expect, it } from "vitest";
import { isValidE164, toE164 } from "@/lib/utils/phone";

describe("toE164", () => {
  it("normalizes an Indian 10-digit number under the default region", () => {
    const r = toE164("9876543210");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.e164).toBe("+919876543210");
      expect(r.country).toBe("IN");
    }
  });

  it("normalizes a +91-prefixed number with spaces", () => {
    const r = toE164(" +91 98765 43210 ");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.e164).toBe("+919876543210");
  });

  it("normalizes a US number when the default region is US", () => {
    const r = toE164("415-555-2671", "US");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.e164).toBe("+14155552671");
  });

  it("rejects empty input", () => {
    const r = toE164("");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("EMPTY");
  });

  it("rejects null/undefined", () => {
    expect(toE164(null).ok).toBe(false);
    expect(toE164(undefined).ok).toBe(false);
  });

  it("rejects a too-short number", () => {
    const r = toE164("123");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("INVALID");
  });

  it("rejects garbage strings", () => {
    expect(toE164("not a phone").ok).toBe(false);
  });
});

describe("isValidE164", () => {
  it("returns true for parseable input", () => {
    expect(isValidE164("9876543210")).toBe(true);
  });
  it("returns false for empty input", () => {
    expect(isValidE164("")).toBe(false);
  });
  it("returns false for garbage", () => {
    expect(isValidE164("xxx")).toBe(false);
  });
});
