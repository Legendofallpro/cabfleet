import { describe, expect, it } from "vitest";

import {
  createPortalClaimToken,
  verifyPortalClaimToken,
} from "./portal-claim-proof";

describe("portal claim token", () => {
  it("round-trips a customer id", () => {
    const token = createPortalClaimToken("cust-1");
    expect(verifyPortalClaimToken(token)).toEqual({ customerId: "cust-1" });
  });

  it("rejects a tampered token", () => {
    const token = createPortalClaimToken("cust-1");
    expect(verifyPortalClaimToken(`${token}x`)).toBeNull();
  });
});
