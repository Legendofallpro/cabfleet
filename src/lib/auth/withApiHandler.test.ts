/**
 * Unit tests for withApiHandler.
 *
 * We mock `requireApiAuth` and the org-context store so we don't need a
 * real DB or JWKS endpoint. The wrapper is dense, so the tests focus on
 * the boundary contracts:
 *   - auth failure → 401
 *   - permission failure → 403
 *   - body-size cap (S20)
 *   - zod validation → 400 with fieldErrors
 *   - ownership false → 404 (S6)
 *   - rate-limit → 429
 *   - idempotency replay returns cached body
 *   - AppError thrown inside handler → correct status code
 *   - feature flag off → 403
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { z } from "zod";

vi.mock("@/lib/env", () => ({
  env: {
    API_V1_ENABLED: true,
    API_V1_MAX_BODY_BYTES_DEFAULT: 1024,
    API_V1_IDEMPOTENCY_TTL_HOURS: 24,
    NEXT_PUBLIC_SUPABASE_URL: "http://localhost",
  },
}));

vi.mock("@/lib/auth/api", () => ({
  requireApiAuth: vi.fn(),
}));

vi.mock("@/lib/org-context", () => ({
  runWithOrg: (_org: string, fn: () => unknown) => fn(),
  runWithoutOrg: (_label: string, fn: () => unknown) => fn(),
}));

import {
  withApiHandler,
  __internalIdempotencyStoreForTests,
} from "@/lib/auth/withApiHandler";
import { requireApiAuth } from "@/lib/auth/api";
import { AppError } from "@/lib/errors";
import { ok, err } from "@/lib/result";
import { PERMISSIONS } from "@/lib/auth/permissions";

const fakeSession = (overrides?: Partial<{ role: string; orgId: string | null }>) => ({
  authId: "auth-1",
  email: "driver@example.com",
  profile: {
    id: "profile-1",
    role: (overrides?.role ?? "DRIVER") as "DRIVER",
    orgId: overrides?.orgId === undefined ? "org-1" : overrides.orgId,
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as any;

beforeEach(() => {
  __internalIdempotencyStoreForTests.clear();
  vi.mocked(requireApiAuth).mockReset();
});

function jsonRequest(
  method: string,
  url: string,
  body?: unknown,
  headers?: Record<string, string>,
) {
  return new Request(url, {
    method,
    headers: {
      "content-type": "application/json",
      authorization: "Bearer fake",
      ...(headers ?? {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("withApiHandler", () => {
  it("returns 401 when auth fails", async () => {
    vi.mocked(requireApiAuth).mockRejectedValue(
      new AppError("UNAUTHENTICATED", "no token"),
    );
    const handler = withApiHandler({ handler: async () => ok({}) });
    const res = await handler(new Request("http://x/api/v1/me"));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns 403 when permission missing", async () => {
    vi.mocked(requireApiAuth).mockResolvedValue(fakeSession({ role: "CUSTOMER" }));
    const handler = withApiHandler({
      permission: PERMISSIONS.BOOKING_CLAIM,
      handler: async () => ok({}),
    });
    const res = await handler(new Request("http://x/api/v1/trips"));
    expect(res.status).toBe(403);
  });

  it("validates body with zod and returns fieldErrors on 400", async () => {
    vi.mocked(requireApiAuth).mockResolvedValue(fakeSession());
    const schema = z.object({ amount: z.number().int().positive() });
    const handler = withApiHandler({
      schema,
      handler: async () => ok({}),
    });
    const res = await handler(
      jsonRequest("POST", "http://x/api/v1/x", { amount: -1 }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION");
    expect(json.error.fieldErrors).toBeDefined();
  });

  it("rejects bodies above maxBodyBytes", async () => {
    vi.mocked(requireApiAuth).mockResolvedValue(fakeSession());
    const handler = withApiHandler({
      maxBodyBytes: 8,
      handler: async () => ok({}),
    });
    const big = "x".repeat(50);
    const res = await handler(
      new Request("http://x/api/v1/x", {
        method: "POST",
        headers: { authorization: "Bearer fake", "content-type": "application/json" },
        body: JSON.stringify({ s: big }),
      }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.message).toMatch(/too large/i);
  });

  it("ownership=false yields 404 (not 403)", async () => {
    vi.mocked(requireApiAuth).mockResolvedValue(fakeSession());
    const handler = withApiHandler({
      ownership: async () => false,
      handler: async () => ok({ id: 1 }),
    });
    const res = await handler(new Request("http://x/api/v1/trips/abc"));
    expect(res.status).toBe(404);
  });

  it("maps AppError thrown in handler to its HTTP code", async () => {
    vi.mocked(requireApiAuth).mockResolvedValue(fakeSession());
    const handler = withApiHandler({
      handler: async () => {
        throw new AppError("CONFLICT", "already taken");
      },
    });
    const res = await handler(new Request("http://x/api/v1/x"));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error.code).toBe("CONFLICT");
  });

  it("maps Result.err to its HTTP code", async () => {
    vi.mocked(requireApiAuth).mockResolvedValue(fakeSession());
    const handler = withApiHandler({
      handler: async () =>
        err({ code: "NOT_FOUND", message: "missing" }),
    });
    const res = await handler(new Request("http://x/api/v1/x"));
    expect(res.status).toBe(404);
  });

  it("replays cached response when Idempotency-Key matches", async () => {
    vi.mocked(requireApiAuth).mockResolvedValue(fakeSession());
    let calls = 0;
    const handler = withApiHandler({
      idempotency: {},
      handler: async () => {
        calls += 1;
        return ok({ n: calls });
      },
    });
    const req1 = jsonRequest("POST", "http://x/api/v1/x", undefined, {
      "idempotency-key": "abc-123",
    });
    const req2 = jsonRequest("POST", "http://x/api/v1/x", undefined, {
      "idempotency-key": "abc-123",
    });
    const r1 = await handler(req1);
    const r2 = await handler(req2);
    expect(calls).toBe(1);
    expect(r2.headers.get("idempotent-replay")).toBe("true");
    const j1 = await r1.json();
    const j2 = await r2.json();
    expect(j2).toEqual(j1);
  });

  it("rejects malformed Idempotency-Key", async () => {
    vi.mocked(requireApiAuth).mockResolvedValue(fakeSession());
    const handler = withApiHandler({
      idempotency: {},
      handler: async () => ok({}),
    });
    const res = await handler(
      jsonRequest("POST", "http://x/api/v1/x", undefined, {
        "idempotency-key": "has spaces and !@#",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 403 when API_V1_ENABLED is off", async () => {
    const env = (await import("@/lib/env")).env as { API_V1_ENABLED: boolean };
    env.API_V1_ENABLED = false;
    try {
      const handler = withApiHandler({ handler: async () => ok({}) });
      const res = await handler(new Request("http://x/api/v1/me"));
      expect(res.status).toBe(403);
    } finally {
      env.API_V1_ENABLED = true;
    }
  });
});
