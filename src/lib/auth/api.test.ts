/**
 * Unit tests for requireApiAuth bearer-token parsing.
 *
 * Full JWKS verification needs network access; that path is covered by
 * the integration suite. Here we focus on the header parser, which is
 * pure logic and the most likely place to ship a bug.
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "http://localhost",
    SUPABASE_JWT_LEGACY_SECRET: undefined,
  },
}));

vi.mock("@/lib/db", () => ({
  db: { profile: { findUnique: vi.fn() } },
}));

vi.mock("@/lib/org-context", () => ({
  runWithoutOrg: (_l: string, fn: () => unknown) => fn(),
}));

import { requireApiAuth } from "@/lib/auth/api";

describe("requireApiAuth — bearer parsing", () => {
  it("rejects requests with no Authorization header", async () => {
    await expect(
      requireApiAuth(new Request("http://x")),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });

  it("rejects non-Bearer schemes", async () => {
    await expect(
      requireApiAuth(
        new Request("http://x", { headers: { authorization: "Basic abc" } }),
      ),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });

  it("rejects malformed Bearer (extra tokens)", async () => {
    await expect(
      requireApiAuth(
        new Request("http://x", {
          headers: { authorization: "Bearer foo bar" },
        }),
      ),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });

  it("rejects empty Bearer value", async () => {
    await expect(
      requireApiAuth(
        new Request("http://x", { headers: { authorization: "Bearer " } }),
      ),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });
});
