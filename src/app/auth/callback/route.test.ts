import { NextRequest } from "next/server";
import { describe, expect, it, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Module mocks — must be declared before any imports that transitively use them
// ---------------------------------------------------------------------------

vi.mock("@/lib/env", () => ({
  env: {
    AUTH_PROOF_SECRET: "test-secret-that-is-at-least-32-chars-long",
    NODE_ENV: "test",
  },
}));

const mockVerifyOtp = vi.fn();
const mockExchangeCodeForSession = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: vi.fn().mockResolvedValue({
    auth: {
      verifyOtp: mockVerifyOtp,
      exchangeCodeForSession: mockExchangeCodeForSession,
      getUser: mockGetUser,
    },
  }),
}));

const mockGetRawAuthUser = vi.fn();
const mockGetSessionUser = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getRawAuthUser: mockGetRawAuthUser,
  getSessionUser: mockGetSessionUser,
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeRequest(params: Record<string, string>) {
  const url = new URL("http://localhost:3000/auth/callback");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

const MOCK_USER = { id: "user-123", email: "driver@example.com" };
const MOCK_PROFILE = { id: "user-123", role: "DRIVER" as const };
const MOCK_SESSION = { authId: "user-123", email: "driver@example.com", profile: MOCK_PROFILE };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /auth/callback", () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    // Re-import the route after resetting mocks so per-request cache is fresh.
    const mod = await import("@/app/auth/callback/route");
    GET = mod.GET;
  });

  describe("token_hash (primary path)", () => {
    it("verifies OTP and redirects invite to /set-password, setting proof cookie", async () => {
      mockVerifyOtp.mockResolvedValue({ error: null });
      mockGetRawAuthUser.mockResolvedValue(MOCK_USER);
      mockGetSessionUser.mockResolvedValue(MOCK_SESSION);

      const req = makeRequest({
        token_hash: "abc123",
        type: "invite",
        redirect_to: "/driver",
      });
      const res = await GET(req);

      expect(res.status).toBe(307);
      const location = new URL(res.headers.get("location")!);
      expect(location.pathname).toBe("/set-password");
      expect(location.searchParams.get("mode")).toBe("invite");
      expect(res.headers.getSetCookie().some((c) => c.startsWith("cabfleet-password-setup-proof="))).toBe(true);
    });

    it("verifies OTP and redirects recovery to /set-password, setting proof cookie", async () => {
      mockVerifyOtp.mockResolvedValue({ error: null });
      mockGetRawAuthUser.mockResolvedValue(MOCK_USER);
      mockGetSessionUser.mockResolvedValue(MOCK_SESSION);

      const req = makeRequest({ token_hash: "abc123", type: "recovery" });
      const res = await GET(req);

      expect(res.status).toBe(307);
      const location = new URL(res.headers.get("location")!);
      expect(location.pathname).toBe("/set-password");
      expect(location.searchParams.get("mode")).toBe("recovery");
    });

    it("redirects to /set-password (invalid-link state) on OTP failure", async () => {
      mockVerifyOtp.mockResolvedValue({ error: { message: "expired" } });

      const req = makeRequest({ token_hash: "bad", type: "recovery" });
      const res = await GET(req);

      expect(res.status).toBe(307);
      const location = new URL(res.headers.get("location")!);
      expect(location.pathname).toBe("/set-password");
      expect(location.searchParams.has("mode")).toBe(false);
      // Proof cookie must be cleared on failure
      expect(res.headers.getSetCookie().some((c) => c.includes("Max-Age=0"))).toBe(true);
    });

    it("redirects to /auth-error?reason=provisioning when Profile row is missing", async () => {
      mockVerifyOtp.mockResolvedValue({ error: null });
      mockGetRawAuthUser.mockResolvedValue(MOCK_USER);
      mockGetSessionUser.mockResolvedValue(null); // Profile not provisioned

      const req = makeRequest({ token_hash: "abc", type: "invite" });
      const res = await GET(req);

      expect(res.status).toBe(307);
      const location = new URL(res.headers.get("location")!);
      expect(location.pathname).toBe("/auth-error");
      expect(location.searchParams.get("reason")).toBe("provisioning");
    });

    it("redirects to /auth-error when Profile is missing for non-password flow too", async () => {
      mockVerifyOtp.mockResolvedValue({ error: null });
      mockGetRawAuthUser.mockResolvedValue(MOCK_USER);
      mockGetSessionUser.mockResolvedValue(null);

      const req = makeRequest({ token_hash: "abc", type: "magiclink" });
      const res = await GET(req);

      const location = new URL(res.headers.get("location")!);
      expect(location.pathname).toBe("/auth-error");
      expect(location.searchParams.get("reason")).toBe("provisioning");
    });

    it("redirects a verified non-password flow to role home", async () => {
      mockVerifyOtp.mockResolvedValue({ error: null });
      mockGetRawAuthUser.mockResolvedValue(MOCK_USER);
      mockGetSessionUser.mockResolvedValue(MOCK_SESSION);

      const req = makeRequest({ token_hash: "abc", type: "magiclink" });
      const res = await GET(req);

      const location = new URL(res.headers.get("location")!);
      expect(location.pathname).toBe("/driver");
    });
  });

  describe("code fallback path", () => {
    it("exchanges code and redirects invite to /set-password", async () => {
      mockExchangeCodeForSession.mockResolvedValue({ error: null });
      mockGetRawAuthUser.mockResolvedValue(MOCK_USER);
      mockGetSessionUser.mockResolvedValue(MOCK_SESSION);

      const req = makeRequest({ code: "pkce-code", mode: "invite" });
      const res = await GET(req);

      const location = new URL(res.headers.get("location")!);
      expect(location.pathname).toBe("/set-password");
    });

    it("redirects to /set-password (no mode) when code exchange fails", async () => {
      mockExchangeCodeForSession.mockResolvedValue({ error: { message: "invalid" } });

      const req = makeRequest({ code: "bad-code" });
      const res = await GET(req);

      const location = new URL(res.headers.get("location")!);
      expect(location.pathname).toBe("/set-password");
      expect(location.searchParams.has("mode")).toBe(false);
    });
  });

  describe("missing token payload", () => {
    it("redirects to /set-password (invalid-link) when no token or code is present", async () => {
      const req = makeRequest({});
      const res = await GET(req);

      const location = new URL(res.headers.get("location")!);
      expect(location.pathname).toBe("/set-password");
      expect(location.searchParams.has("mode")).toBe(false);
    });
  });
});
