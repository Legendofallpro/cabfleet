import { describe, expect, it } from "vitest";
import { gstBreakdown, roundMoney } from "./gst";

describe("gstBreakdown", () => {
  it("hides GST when the rate is 0", () => {
    const b = gstBreakdown({
      fareEstimate: 500,
      fareFinal: null,
      tollAmount: 0,
      parkingAmount: 0,
      gstRate: 0,
    });
    expect(b.transport).toBe(500);
    expect(b.gst).toBe(0);
    expect(b.total).toBe(500);
  });

  it("charges GST on transport only at 5%", () => {
    const b = gstBreakdown({
      fareEstimate: 1000,
      fareFinal: null,
      tollAmount: 40,
      parkingAmount: 10,
      gstRate: 5,
    });
    expect(b.transport).toBe(1000);
    expect(b.extras).toBe(50);
    expect(b.gst).toBe(50);
    expect(b.total).toBe(1100);
  });

  it("peels extras out of fareFinal so GST is not charged on toll", () => {
    const b = gstBreakdown({
      fareEstimate: 800,
      fareFinal: 860,
      tollAmount: 50,
      parkingAmount: 10,
      gstRate: 12,
    });
    expect(b.transport).toBe(800);
    expect(b.gst).toBe(96);
    expect(b.total).toBe(956);
  });

  it("charges 18% of transport 100", () => {
    const b = gstBreakdown({
      fareEstimate: 100,
      fareFinal: null,
      tollAmount: 0,
      parkingAmount: 0,
      gstRate: 18,
    });
    expect(b.gstRate).toBe(18);
    expect(b.gst).toBe(18);
    expect(b.total).toBe(118);
  });

  it("coerces out-of-range rates to 0", () => {
    for (const gstRate of [101, -1]) {
      const b = gstBreakdown({
        fareEstimate: 100,
        fareFinal: null,
        tollAmount: 0,
        parkingAmount: 0,
        gstRate,
      });
      expect(b.gstRate).toBe(0);
      expect(b.gst).toBe(0);
      expect(b.total).toBe(100);
    }
  });
});

describe("roundMoney", () => {
  it("rounds to paise", () => {
    expect(roundMoney(10.005)).toBe(10.01);
  });
});
