import { describe, expect, it } from "vitest";
import { defaultsForCountry } from "./country-defaults";

describe("defaultsForCountry", () => {
  it("returns India GSTIN/INR/IST defaults", () => {
    expect(defaultsForCountry("IN")).toEqual({
      currency: "INR",
      locale: "en-IN",
      timezone: "Asia/Kolkata",
      phoneRegion: "IN",
      taxIdLabel: "GSTIN",
      taxRate: 0,
    });
  });

  it("is case-insensitive", () => {
    expect(defaultsForCountry("in").currency).toBe("INR");
  });

  it("falls back for unknown ISO codes", () => {
    expect(defaultsForCountry("ZZ")).toEqual({
      currency: "USD",
      locale: "en-US",
      timezone: "UTC",
      phoneRegion: "US",
      taxIdLabel: "Tax ID",
      taxRate: 0,
    });
  });

  it("has explicit rows for US, GB, AE, AU, SG, DE", () => {
    expect(defaultsForCountry("US").currency).toBe("USD");
    expect(defaultsForCountry("GB").currency).toBe("GBP");
    expect(defaultsForCountry("AE").timezone).toBe("Asia/Dubai");
    expect(defaultsForCountry("AU").currency).toBe("AUD");
    expect(defaultsForCountry("SG").currency).toBe("SGD");
    expect(defaultsForCountry("DE").taxIdLabel).toBe("VAT");
  });
});
