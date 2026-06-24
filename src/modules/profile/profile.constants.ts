import type { NotificationPrefs } from "@/modules/notifications/services/NotificationService";
import type { UpdateNotificationPrefsFormValues } from "@/modules/profile/validators/profile";

export const DEFAULT_NOTIFICATION_PREFS: UpdateNotificationPrefsFormValues = {
  whatsapp: true,
  email: true,
  quietHoursStart: "",
  quietHoursEnd: "",
  timezone: "Asia/Kolkata",
};

export function parseNotificationPrefsFormValues(
  raw: unknown,
): UpdateNotificationPrefsFormValues {
  const prefs = (raw ?? {}) as NotificationPrefs;
  return {
    whatsapp: prefs.whatsapp ?? DEFAULT_NOTIFICATION_PREFS.whatsapp,
    email: prefs.email ?? DEFAULT_NOTIFICATION_PREFS.email,
    quietHoursStart: prefs.quietHoursStart ?? "",
    quietHoursEnd: prefs.quietHoursEnd ?? "",
    timezone: prefs.timezone ?? DEFAULT_NOTIFICATION_PREFS.timezone,
  };
}

/** Human-readable quiet-hours preview for the notification prefs form. */
export function formatQuietHoursPreview(
  start: string | undefined,
  end: string | undefined,
  timezone: string | undefined,
): string | null {
  const s = start?.trim();
  const e = end?.trim();
  if (!s && !e) return null;
  if (!s || !e) return "Set both start and end times to enable quiet hours.";
  const tz = timezone?.trim() || DEFAULT_NOTIFICATION_PREFS.timezone;
  return `Quiet hours: ${s}–${e} (${tz}). Urgent alerts may still be delivered.`;
}
