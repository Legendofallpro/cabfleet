import { describe, expect, it } from "vitest";
import { DRIVER_ALLOWED_TARGETS, DRIVER_NEXT_ACTIONS } from "./booking.constants";

describe("DRIVER_NEXT_ACTIONS", () => {
  it("covers every status in DRIVER_ALLOWED_TARGETS as a reachable toStatus", () => {
    const reachableTargets = new Set(
      Object.values(DRIVER_NEXT_ACTIONS)
        .flat()
        .map((a) => a.toStatus),
    );

    for (const target of DRIVER_ALLOWED_TARGETS) {
      expect(
        reachableTargets.has(target),
        `DRIVER_NEXT_ACTIONS is missing a button that reaches ${target}. ` +
          `Add it or update DRIVER_ALLOWED_TARGETS.`,
      ).toBe(true);
    }
  });
});
