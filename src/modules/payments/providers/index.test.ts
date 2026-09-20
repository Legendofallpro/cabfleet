import { afterEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";

const envState = vi.hoisted(() => ({
  PAYMENT_GATEWAY: "MANUAL" as "MANUAL" | "RAZORPAY",
  RAZORPAY_KEY_ID: undefined as string | undefined,
  RAZORPAY_KEY_SECRET: undefined as string | undefined,
  RAZORPAY_WEBHOOK_SECRET: undefined as string | undefined,
}));

vi.mock("@/lib/env", () => ({
  env: envState,
}));

import {
  __resetPaymentProviderForTests,
  getPaymentProvider,
} from "./index";

describe("getPaymentProvider", () => {
  afterEach(() => {
    __resetPaymentProviderForTests();
    envState.PAYMENT_GATEWAY = "MANUAL";
    envState.RAZORPAY_KEY_ID = undefined;
    envState.RAZORPAY_KEY_SECRET = undefined;
    envState.RAZORPAY_WEBHOOK_SECRET = undefined;
  });

  it("returns Manual when the gateway is MANUAL", () => {
    expect(getPaymentProvider("IN").name).toBe("MANUAL");
  });

  it("returns Manual for non-IN even when Razorpay env is complete", () => {
    envState.PAYMENT_GATEWAY = "RAZORPAY";
    envState.RAZORPAY_KEY_ID = "rzp_test";
    envState.RAZORPAY_KEY_SECRET = "secret";
    envState.RAZORPAY_WEBHOOK_SECRET = "whsec";
    expect(getPaymentProvider("US").name).toBe("MANUAL");
  });

  it("throws when Razorpay is selected with incomplete credentials", () => {
    envState.PAYMENT_GATEWAY = "RAZORPAY";
    envState.RAZORPAY_KEY_ID = "rzp_test";
    expect(() => getPaymentProvider("IN")).toThrow(AppError);
  });

  it("returns Razorpay for IN when secrets are set", () => {
    envState.PAYMENT_GATEWAY = "RAZORPAY";
    envState.RAZORPAY_KEY_ID = "rzp_test";
    envState.RAZORPAY_KEY_SECRET = "secret";
    envState.RAZORPAY_WEBHOOK_SECRET = "whsec";
    expect(getPaymentProvider("IN").name).toBe("RAZORPAY");
  });
});
