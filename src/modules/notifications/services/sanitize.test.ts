import { describe, expect, it } from "vitest";
import {
  sanitizeTemplateVar,
  sanitizeVariables,
} from "@/modules/notifications/services/sanitize";

describe("sanitizeTemplateVar", () => {
  it("strips http and https URLs", () => {
    expect(sanitizeTemplateVar("Aman click https://evil.com to win")).toBe(
      "Aman click to win",
    );
    expect(sanitizeTemplateVar("see http://bad/path now")).toBe("see now");
  });

  it("strips ftp/file/data schemes", () => {
    expect(sanitizeTemplateVar("data:text/html,<script>")).toBe("");
  });

  it("strips zero-width and control characters", () => {
    expect(sanitizeTemplateVar("Hello\u200BWorld\u200C!")).toBe("HelloWorld!");
    expect(sanitizeTemplateVar("ab\u0000cd")).toBe("abcd");
  });

  it("collapses whitespace runs", () => {
    // Tabs are stripped as control characters first; remaining space runs
    // collapse to single spaces.
    expect(sanitizeTemplateVar("a    b   c")).toBe("a b c");
  });

  it("strips tabs as control characters", () => {
    expect(sanitizeTemplateVar("a\tb\tc")).toBe("abc");
  });

  it("truncates to the configured length", () => {
    expect(sanitizeTemplateVar("x".repeat(120), 50)).toHaveLength(50);
    expect(sanitizeTemplateVar("x".repeat(120), 10)).toBe("x".repeat(10));
  });

  it("returns numbers as their string form", () => {
    expect(sanitizeTemplateVar(42)).toBe("42");
  });
});

describe("sanitizeVariables", () => {
  it("normalizes every string entry while leaving numbers alone", () => {
    const out = sanitizeVariables({
      name: "Aman click http://evil.com",
      seats: 4,
      address: "Bldg 1\u200B, MG Road",
    });
    expect(out.name).toBe("Aman click");
    expect(out.seats).toBe(4);
    expect(out.address).toBe("Bldg 1, MG Road");
  });
});
