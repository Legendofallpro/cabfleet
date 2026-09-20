import { afterEach, describe, expect, it } from "vitest";

import { isInstallGateEnabled } from "./env";

const original = process.env.INSTALL_GATE;

afterEach(() => {
  if (original === undefined) {
    delete process.env.INSTALL_GATE;
  } else {
    process.env.INSTALL_GATE = original;
  }
});

describe("isInstallGateEnabled", () => {
  it("defaults on when unset", () => {
    delete process.env.INSTALL_GATE;
    expect(isInstallGateEnabled()).toBe(true);
  });

  it("defaults on when empty", () => {
    process.env.INSTALL_GATE = "";
    expect(isInstallGateEnabled()).toBe(true);
  });

  it('treats "false" as off', () => {
    process.env.INSTALL_GATE = "false";
    expect(isInstallGateEnabled()).toBe(false);
  });

  it('treats "true" as on', () => {
    process.env.INSTALL_GATE = "true";
    expect(isInstallGateEnabled()).toBe(true);
  });
});
