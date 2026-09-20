import { describe, expect, it } from "vitest";
import { formatMoney } from "./money";

describe("formatMoney", () => {
  it("formats INR in en-IN without a hardcoded rupee in the helper", () => {
    const s = formatMoney(499, { locale: "en-IN", currency: "INR" });
    expect(s).toMatch(/499/);
    expect(s).toMatch(/₹|INR/);
  });

  it("formats USD in en-US", () => {
    const s = formatMoney(499, { locale: "en-US", currency: "USD" });
    expect(s).toMatch(/499/);
    expect(s).toMatch(/\$|USD/);
  });
});
