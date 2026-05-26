import { describe, expect, it, vi } from "vitest";

// Mock env before importing the module so AUTH_PROOF_SECRET is always present.
vi.mock("@/lib/env", () => ({
  env: {
    AUTH_PROOF_SECRET: "test-secret-that-is-at-least-32-chars-long",
    NODE_ENV: "test",
  },
}));

// Dynamic import so the mock is applied first.
const { createProof, verifyProof, PROOF_COOKIE_NAME } = await import(
  "@/lib/auth/password-setup-proof"
);

const VALID_USER_ID = "user-abc-123";
const VALID_FLOW = "invite" as const;
const VALID_REDIRECT = "/driver";

describe("createProof + verifyProof (round-trip)", () => {
  it("returns a valid proof payload for a fresh token", () => {
    const token = createProof(VALID_USER_ID, VALID_FLOW, VALID_REDIRECT);
    const result = verifyProof(token);

    expect(result).not.toBeNull();
    expect(result?.authUserId).toBe(VALID_USER_ID);
    expect(result?.flow).toBe(VALID_FLOW);
    expect(result?.redirectTo).toBe(VALID_REDIRECT);
  });

  it("round-trips with recovery flow", () => {
    const token = createProof(VALID_USER_ID, "recovery", "/portal/book");
    const result = verifyProof(token);

    expect(result?.flow).toBe("recovery");
    expect(result?.redirectTo).toBe("/portal/book");
  });
});

describe("verifyProof", () => {
  it("returns null for a tampered signature", () => {
    const token = createProof(VALID_USER_ID, VALID_FLOW, VALID_REDIRECT);
    const tampered = token.slice(0, -3) + "XXX";

    expect(verifyProof(tampered)).toBeNull();
  });

  it("returns null for a tampered payload", () => {
    const token = createProof(VALID_USER_ID, VALID_FLOW, VALID_REDIRECT);
    const [payload, sig] = token.split(".");
    // Flip one char in the payload
    const tamperedPayload = payload.slice(0, -1) + (payload.endsWith("A") ? "B" : "A");

    expect(verifyProof(`${tamperedPayload}.${sig}`)).toBeNull();
  });

  it("returns null for an expired token", () => {
    // Advance time by 11 minutes (TTL is 10 minutes)
    const now = Math.floor(Date.now() / 1000);
    vi.useFakeTimers();
    vi.setSystemTime((now - 11 * 60) * 1000);
    const token = createProof(VALID_USER_ID, VALID_FLOW, VALID_REDIRECT);
    vi.useRealTimers();

    expect(verifyProof(token)).toBeNull();
  });

  it("returns null for a completely invalid string", () => {
    expect(verifyProof("not-a-valid-token")).toBeNull();
    expect(verifyProof("")).toBeNull();
    expect(verifyProof("no.dots.here.and.more")).toBeNull();
  });

  it("returns null when there is no dot separator", () => {
    expect(verifyProof("payloadonly")).toBeNull();
  });
});

describe("PROOF_COOKIE_NAME", () => {
  it("is the expected constant", () => {
    expect(PROOF_COOKIE_NAME).toBe("cabfleet-password-setup-proof");
  });
});
