import { describe, expect, it } from "vitest";
import { formatDateTime } from "./datetime";

describe("formatDateTime", () => {
  it("uses the given timeZone", () => {
    const d = new Date("2026-09-20T06:30:00.000Z");
    const kolkata = formatDateTime(d, {
      locale: "en-IN",
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    });
    const utc = formatDateTime(d, {
      locale: "en-US",
      timeZone: "UTC",
      dateStyle: "medium",
      timeStyle: "short",
    });
    expect(kolkata).not.toEqual(utc);
  });
});
