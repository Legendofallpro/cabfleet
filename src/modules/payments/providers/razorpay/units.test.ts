import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import {
  fromPaise,
  toPaise,
} from "@/modules/payments/providers/razorpay/units";

describe("toPaise", () => {
  it("converts integer rupees", () => {
    expect(toPaise(100)).toBe(10000);
  });
  it("converts fractional rupees", () => {
    expect(toPaise(1.5)).toBe(150);
    expect(toPaise(0.01)).toBe(1);
  });
  it("converts a Prisma Decimal", () => {
    expect(toPaise(new Prisma.Decimal("249.99"))).toBe(24999);
  });
  it("rounds at the paise boundary", () => {
    expect(toPaise(0.005)).toBe(1);
  });
});

describe("fromPaise", () => {
  it("converts back to rupees as Decimal", () => {
    expect(fromPaise(10000).toString()).toBe("100");
    expect(fromPaise(24999).toString()).toBe("249.99");
  });
});
