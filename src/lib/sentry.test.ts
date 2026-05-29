import { describe, expect, it } from "vitest";
import { scrubPii, sentryOptions } from "@/lib/sentry";

describe("scrubPii", () => {
  it("redacts top-level PII keys", () => {
    const out = scrubPii({
      email: "user@example.com",
      phone: "+919999999999",
      role: "DRIVER",
    });
    expect(out).toEqual({
      email: "[redacted]",
      phone: "[redacted]",
      role: "DRIVER",
    });
  });

  it("walks nested objects", () => {
    const out = scrubPii({
      profile: { email: "u@x.com", fullName: "Aman", role: "ADMIN" },
      booking: { customer: { phone: "+91...", id: "abc" } },
    }) as {
      profile: { email: string; fullName: string; role: string };
      booking: { customer: { phone: string; id: string } };
    };
    expect(out.profile.email).toBe("[redacted]");
    expect(out.profile.fullName).toBe("[redacted]");
    expect(out.profile.role).toBe("ADMIN");
    expect(out.booking.customer.phone).toBe("[redacted]");
    expect(out.booking.customer.id).toBe("abc");
  });

  it("redacts GPS coordinates", () => {
    const out = scrubPii({ lat: 12.97, lng: 77.59, recordedAt: "x" }) as unknown as {
      lat: string;
      lng: string;
      recordedAt: string;
    };
    expect(out.lat).toBe("[redacted]");
    expect(out.lng).toBe("[redacted]");
    expect(out.recordedAt).toBe("x");
  });

  it("handles arrays without mutating the input", () => {
    const input = [
      { email: "a@x.com", id: "1" },
      { email: "b@x.com", id: "2" },
    ];
    const out = scrubPii(input);
    expect(out).toEqual([
      { email: "[redacted]", id: "1" },
      { email: "[redacted]", id: "2" },
    ]);
    expect(input[0].email).toBe("a@x.com");
  });

  it("returns primitives unchanged", () => {
    expect(scrubPii("hello")).toBe("hello");
    expect(scrubPii(42)).toBe(42);
    expect(scrubPii(null)).toBeNull();
    expect(scrubPii(undefined)).toBeUndefined();
  });

  it("caps recursion depth to avoid stack blowups", () => {
    type Recursive = { next?: Recursive; email?: string };
    const deep: Recursive = { email: "leak@x.com" };
    let cur: Recursive = deep;
    for (let i = 0; i < 20; i += 1) {
      cur.next = { email: "leak@x.com" };
      cur = cur.next;
    }
    // Should not throw, and top-level email is redacted.
    const out = scrubPii(deep) as Recursive;
    expect(out.email).toBe("[redacted]");
  });
});

describe("sentryOptions.beforeSend", () => {
  it("strips Authorization, Cookie headers and scrubs request.data + extra", () => {
    const opts = sentryOptions();
    const event = {
      request: {
        headers: {
          authorization: "Bearer secret",
          Cookie: "sb-access=secret",
          "user-agent": "vitest",
        },
        data: { email: "a@x.com", id: "1" },
      },
      contexts: { user: { phone: "+91...", role: "DRIVER" } },
      extra: { booking: { fullName: "Aman" } },
    } as Record<string, unknown>;

    const out = opts.beforeSend(event)!;
    const req = out.request as { headers: Record<string, string>; data: unknown };
    expect(req.headers.authorization).toBeUndefined();
    expect(req.headers.Cookie).toBeUndefined();
    expect(req.headers["user-agent"]).toBe("vitest");
    expect(req.data).toEqual({ email: "[redacted]", id: "1" });
    const contexts = out.contexts as { user: { phone: string; role: string } };
    expect(contexts.user.phone).toBe("[redacted]");
    expect(contexts.user.role).toBe("DRIVER");
    const extra = out.extra as { booking: { fullName: string } };
    expect(extra.booking.fullName).toBe("[redacted]");
  });
});
