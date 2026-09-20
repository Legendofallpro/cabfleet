import type { NotificationPrefs } from "@/modules/notifications/services/NotificationService";
import type { UpdateNotificationPrefsFormValues } from "@/modules/profile/validators/profile";

export function defaultNotificationPrefs(
  timezone: string,
): UpdateNotificationPrefsFormValues {
  return {
    whatsapp: true,
    email: true,
    quietHoursStart: "",
    quietHoursEnd: "",
    timezone,
  };
}

/** @deprecated Prefer `defaultNotificationPrefs(installTimezone)` at call sites. */
export const DEFAULT_NOTIFICATION_PREFS = defaultNotificationPrefs("UTC");

export function parseNotificationPrefsFormValues(
  raw: unknown,
  defaultTimezone: string,
): UpdateNotificationPrefsFormValues {
  const prefs = (raw ?? {}) as NotificationPrefs;
  const defaults = defaultNotificationPrefs(defaultTimezone);
  return {
    whatsapp: prefs.whatsapp ?? defaults.whatsapp,
    email: prefs.email ?? defaults.email,
    quietHoursStart: prefs.quietHoursStart ?? "",
    quietHoursEnd: prefs.quietHoursEnd ?? "",
    timezone: prefs.timezone ?? defaults.timezone,
  };
}

/** Human-readable quiet-hours preview for the notification prefs form. */
export function formatQuietHoursPreview(
  start: string | undefined,
  end: string | undefined,
  timezone: string | undefined,
  defaultTimezone = "UTC",
): string | null {
  const s = start?.trim();
  const e = end?.trim();
  if (!s && !e) return null;
  if (!s || !e) return "Set both start and end times to enable quiet hours.";
  const tz = timezone?.trim() || defaultTimezone;
  return `Quiet hours: ${s}–${e} (${tz}). Urgent alerts may still be delivered.`;
}
