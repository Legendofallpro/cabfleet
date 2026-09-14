import { describe, expect, it, vi } from "vitest";

const envState = vi.hoisted(() => ({ CRON_SECRET: "super-secret" as string | undefined }));

vi.mock("@/lib/env", () => ({ env: envState }));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

import { isAuthorizedCronRequest } from "./cron-auth";

describe("isAuthorizedCronRequest", () => {
  it("accepts the matching Bearer token", () => {
    expect(
      isAuthorizedCronRequest({
        headers: new Headers({ authorization: "Bearer super-secret" }),
      }),
    ).toBe(true);
  });

  it("rejects a different-length token without throwing", () => {
    expect(
      isAuthorizedCronRequest({
        headers: new Headers({ authorization: "Bearer x" }),
      }),
    ).toBe(false);
  });
});
