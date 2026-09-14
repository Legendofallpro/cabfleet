import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  assertSourceIp,
  parseAllowList,
  resolveRazorpayEventId,
  verifyHmacSha256,
} from "@/lib/webhooks";

describe("verifyHmacSha256", () => {
  const secret = "shhhhh";

  it("accepts a correctly-signed body (Razorpay sample shape)", () => {
    const raw = JSON.stringify({ event: "payment.captured", id: "evt_123" });
    const sig = createHmac("sha256", secret).update(raw).digest("hex");
    expect(verifyHmacSha256(raw, sig, secret)).toBe(true);
  });

  it("rejects a one-character mutation of the body", () => {
    const raw = JSON.stringify({ event: "payment.captured", id: "evt_123" });
    const sig = createHmac("sha256", secret).update(raw).digest("hex");
    const tampered = raw.replace("captured", "Captured");
    expect(verifyHmacSha256(tampered, sig, secret)).toBe(false);
  });

  it("rejects a wrong secret", () => {
    const raw = "{}";
    const sig = createHmac("sha256", "other").update(raw).digest("hex");
    expect(verifyHmacSha256(raw, sig, secret)).toBe(false);
  });

  it("rejects a length-mismatched signature without throwing", () => {
    expect(verifyHmacSha256("{}", "deadbeef", secret)).toBe(false);
  });

  it("rejects empty inputs defensively", () => {
    expect(verifyHmacSha256("", "", "")).toBe(false);
    expect(verifyHmacSha256("body", "", secret)).toBe(false);
  });

  it("rejects non-hex signature strings", () => {
    expect(verifyHmacSha256("body", "not-hex!!", secret)).toBe(false);
  });
});

describe("assertSourceIp", () => {
  function req(xff: string | null): Request {
    const headers = new Headers();
    if (xff !== null) headers.set("x-forwarded-for", xff);
    return new Request("https://example.com/", { headers });
  }

  it("returns ok when the allow-list is empty", () => {
    expect(assertSourceIp(req("203.0.113.7"), [])).toEqual({ ok: true });
  });

  it("matches an exact IPv4", () => {
    expect(
      assertSourceIp(req("203.0.113.7"), ["203.0.113.7"]).ok,
    ).toBe(true);
  });

  it("matches a CIDR /24", () => {
    expect(
      assertSourceIp(req("203.0.113.42"), ["203.0.113.0/24"]).ok,
    ).toBe(true);
  });

  it("rejects an IP outside the CIDR", () => {
    expect(
      assertSourceIp(req("198.51.100.1"), ["203.0.113.0/24"]).ok,
    ).toBe(false);
  });

  it("uses the leftmost value of x-forwarded-for", () => {
    expect(
      assertSourceIp(
        req("203.0.113.7, 10.0.0.1"),
        ["203.0.113.0/24"],
      ).ok,
    ).toBe(true);
  });

  it("rejects when no source IP is resolvable", () => {
    expect(assertSourceIp(req(null), ["203.0.113.0/24"]).ok).toBe(false);
  });
});

describe("parseAllowList", () => {
  it("splits and trims", () => {
    expect(parseAllowList("203.0.113.0/24,  198.51.100.1")).toEqual([
      "203.0.113.0/24",
      "198.51.100.1",
    ]);
  });
  it("returns an empty array for undefined / empty input", () => {
    expect(parseAllowList(undefined)).toEqual([]);
    expect(parseAllowList("")).toEqual([]);
  });
});

describe("resolveRazorpayEventId", () => {
  it("reads x-razorpay-event-id and ignores a missing body id", () => {
    const req = new Request("https://example.com/", {
      headers: { "x-razorpay-event-id": "evt_test" },
    });
    expect(resolveRazorpayEventId(req)).toBe("evt_test");
  });

  it("returns null when the header is missing", () => {
    expect(resolveRazorpayEventId(new Request("https://example.com/"))).toBeNull();
  });
});
