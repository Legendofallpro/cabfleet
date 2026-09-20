import { describe, expect, it } from "vitest";

import {
  DEFAULT_NOTIFICATION_PREFS,
  defaultNotificationPrefs,
  formatQuietHoursPreview,
  parseNotificationPrefsFormValues,
} from "@/modules/profile/profile.constants";
import {
  updateNotificationPrefsSchema,
  updateProfileSchema,
} from "@/modules/profile/validators/profile";

describe("profile validators", () => {
  it("accepts valid profile input", () => {
    const parsed = updateProfileSchema.parse({ fullName: "Test User", phone: "+91111" });
    expect(parsed.fullName).toBe("Test User");
  });

  it("rejects empty full name", () => {
    expect(() => updateProfileSchema.parse({ fullName: "  " })).toThrow();
  });

  it("validates HH:MM quiet hours", () => {
    expect(() =>
      updateNotificationPrefsSchema.parse({
        ...DEFAULT_NOTIFICATION_PREFS,
        quietHoursStart: "9:5",
      }),
    ).toThrow();
    const ok = updateNotificationPrefsSchema.parse({
      ...DEFAULT_NOTIFICATION_PREFS,
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
    });
    expect(ok.quietHoursStart).toBe("22:00");
  });
});

describe("profile.constants", () => {
  it("defaultNotificationPrefs uses the supplied timezone", () => {
    expect(defaultNotificationPrefs("UTC").timezone).toBe("UTC");
  });

  it("applies defaults for missing prefs", () => {
    const values = parseNotificationPrefsFormValues({}, "UTC");
    expect(values.timezone).toBe("UTC");
    expect(values.email).toBe(true);
  });

  it("formats quiet hours preview", () => {
    expect(formatQuietHoursPreview("", "", "Asia/Kolkata")).toBeNull();
    expect(formatQuietHoursPreview("22:00", "", "Asia/Kolkata")).toContain("both");
    expect(formatQuietHoursPreview("22:00", "07:00", "Asia/Kolkata")).toContain("22:00");
  });
});
