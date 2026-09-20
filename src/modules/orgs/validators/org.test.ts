import { describe, expect, it } from "vitest";

import { makeUpdateOrgGstSchema } from "./org";

describe("makeUpdateOrgGstSchema", () => {
  const base = { orgId: "org-1" };

  it("rejects invalid GSTIN for IN", () => {
    const result = makeUpdateOrgGstSchema("IN").safeParse({
      ...base,
      gstin: "NOPE",
      gstRate: 18,
    });
    expect(result.success).toBe(false);
  });

  it("accepts generic tax ID for US", () => {
    const result = makeUpdateOrgGstSchema("US").safeParse({
      ...base,
      gstin: "12-3456789",
      gstRate: 18,
    });
    expect(result.success).toBe(true);
  });

  it("accepts gstRate 18 for IN and US", () => {
    expect(
      makeUpdateOrgGstSchema("IN").safeParse({ ...base, gstin: "", gstRate: 18 })
        .success,
    ).toBe(true);
    expect(
      makeUpdateOrgGstSchema("US").safeParse({ ...base, gstin: "", gstRate: 18 })
        .success,
    ).toBe(true);
  });

  it("rejects gstRate above 100", () => {
    expect(
      makeUpdateOrgGstSchema("IN").safeParse({ ...base, gstin: "", gstRate: 101 })
        .success,
    ).toBe(false);
    expect(
      makeUpdateOrgGstSchema("US").safeParse({ ...base, gstin: "", gstRate: 101 })
        .success,
    ).toBe(false);
  });
});
