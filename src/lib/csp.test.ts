import { describe, expect, it } from "vitest";
import { composeCsp, RAZORPAY_CSP, REALTIME_CSP } from "@/lib/csp";

describe("composeCsp", () => {
  it("emits the base policy when all flags off", () => {
    const out = composeCsp({});
    expect(out).toContain("default-src 'self'");
    expect(out).toContain("base-uri 'self'");
    expect(out).toContain("frame-ancestors 'none'");
    expect(out).toContain("object-src 'none'");
    expect(out).not.toContain("razorpay.com");
    expect(out).not.toContain("maptiler.com");
  });

  it("does not allow arbitrary https: images in the base policy", () => {
    const out = composeCsp({});
    const img = out.split("; ").find((d) => d.startsWith("img-src"))!;
    const tokens = img.split(" ").slice(1);
    expect(tokens).not.toContain("https:");
    expect(tokens).toEqual(expect.arrayContaining(["'self'", "data:", "blob:"]));
  });

  it("adds Razorpay hosts when razorpay flag set", () => {
    const out = composeCsp({ razorpay: true });
    for (const host of RAZORPAY_CSP["script-src"] ?? []) {
      expect(out).toContain(host);
    }
    for (const host of RAZORPAY_CSP["connect-src"] ?? []) {
      expect(out).toContain(host);
    }
  });

  it("adds map tile hosts when realtime flag set", () => {
    const out = composeCsp({ realtime: true });
    for (const host of REALTIME_CSP["connect-src"] ?? []) {
      expect(out).toContain(host);
    }
  });

  it("merges deltas without duplicating directives", () => {
    const out = composeCsp({ razorpay: true, realtime: true });
    const connectMatches = out.match(/connect-src/g) ?? [];
    expect(connectMatches.length).toBe(1);
    const scriptMatches = out.match(/script-src/g) ?? [];
    expect(scriptMatches.length).toBe(1);
  });

  it("deduplicates merged values within a directive", () => {
    const out = composeCsp({ razorpay: true });
    const connect = out
      .split("; ")
      .find((d) => d.startsWith("connect-src"))!;
    const tokens = connect.split(" ").filter(Boolean);
    const set = new Set(tokens);
    expect(set.size).toBe(tokens.length);
  });
});
