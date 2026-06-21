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
