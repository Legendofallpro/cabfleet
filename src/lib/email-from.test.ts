import { describe, expect, it } from "vitest";
import { resolveMailFrom } from "./email-from";

describe("resolveMailFrom", () => {
  it("uses the env value when set", () => {
    expect(resolveMailFrom("CabFleet <ops@example.com>")).toBe(
      "CabFleet <ops@example.com>",
    );
  });
  it("falls back when empty", () => {
    expect(resolveMailFrom(undefined)).toBe("CabFleet <noreply@localhost>");
    expect(resolveMailFrom("")).toBe("CabFleet <noreply@localhost>");
  });
});
