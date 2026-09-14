import { describe, expect, it } from "vitest";
import { getClientIp } from "./rate-limit";

function headers(init: Record<string, string>): Headers {
  return new Headers(init);
}

describe("getClientIp", () => {
  it("prefers x-vercel-forwarded-for over X-Forwarded-For", () => {
    expect(
      getClientIp({
        headers: headers({
          "x-forwarded-for": "1.1.1.1, 2.2.2.2",
          "x-vercel-forwarded-for": "9.9.9.9",
        }),
      }),
    ).toBe("9.9.9.9");
  });

  it("prefers cf-connecting-ip over X-Forwarded-For", () => {
    expect(
      getClientIp({
        headers: headers({
          "x-forwarded-for": "1.1.1.1",
          "cf-connecting-ip": "8.8.8.8",
        }),
      }),
    ).toBe("8.8.8.8");
  });

  it("does not trust the leftmost X-Forwarded-For hop", () => {
    expect(
      getClientIp({
        headers: headers({ "x-forwarded-for": "1.1.1.1, 10.0.0.1" }),
      }),
    ).toBe("10.0.0.1");
  });
});
