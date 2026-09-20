import { z } from "zod";

const hhmmSchema = z.string().refine((val) => val === "" || /^(\d{2}):(\d{2})$/.test(val), {
  message: "Use HH:MM format",
});

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(120),
  phone: z.string().trim().max(32).optional().nullable(),
});

export type UpdateProfileFormValues = z.input<typeof updateProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const updateNotificationPrefsSchema = z.object({
  whatsapp: z.boolean(),
  email: z.boolean(),
  quietHoursStart: hhmmSchema,
  quietHoursEnd: hhmmSchema,
  timezone: z.string().trim().min(1, "Timezone is required").max(64),
});

export type UpdateNotificationPrefsFormValues = z.input<typeof updateNotificationPrefsSchema>;
export type UpdateNotificationPrefsInput = z.infer<typeof updateNotificationPrefsSchema>;

export const updateLocaleSchema = z.object({
  locale: z.string().trim().min(2).max(16),
});

export type UpdateLocaleFormValues = z.input<typeof updateLocaleSchema>;
export type UpdateLocaleInput = z.infer<typeof updateLocaleSchema>;

export const updateAvatarUrlSchema = z.object({
  avatarUrl: z.string().url().max(2048),
});

export type UpdateAvatarUrlInput = z.infer<typeof updateAvatarUrlSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    password: z.string().min(8, "Password must be at least 8 characters").max(128),
    confirmPassword: z.string().min(8).max(128),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export type ChangePasswordFormValues = z.input<typeof changePasswordSchema>;

const LOCALE_LABELS: Record<string, string> = {
  "en-US": "English (US)",
  "en-GB": "English (UK)",
  "en-IN": "English (India)",
  "hi-IN": "Hindi (India)",
};

const TIMEZONE_LABELS: Record<string, string> = {
  UTC: "UTC",
  "Asia/Kolkata": "Asia/Kolkata (IST)",
  "Asia/Dubai": "Asia/Dubai (GST)",
  "Europe/London": "Europe/London (GMT/BST)",
  "America/New_York": "America/New_York (ET)",
};

function dedupeOptions(
  options: readonly { value: string; label: string }[],
): { value: string; label: string }[] {
  const seen = new Set<string>();
  return options.filter((o) => {
    if (seen.has(o.value)) return false;
    seen.add(o.value);
    return true;
  });
}

export function buildLocaleOptions(installLocale: string) {
  const fallbackLabel = installLocale;
  return dedupeOptions([
    {
      value: installLocale,
      label: LOCALE_LABELS[installLocale] ?? fallbackLabel,
    },
    { value: "en-US", label: LOCALE_LABELS["en-US"] },
    { value: "en-GB", label: LOCALE_LABELS["en-GB"] },
    { value: "en-IN", label: LOCALE_LABELS["en-IN"] },
    { value: "hi-IN", label: LOCALE_LABELS["hi-IN"] },
  ]);
}

export function buildTimezoneOptions(installTimezone: string) {
  const fallbackLabel = installTimezone;
  return dedupeOptions([
    {
      value: installTimezone,
      label: TIMEZONE_LABELS[installTimezone] ?? fallbackLabel,
    },
    { value: "UTC", label: TIMEZONE_LABELS.UTC },
    { value: "Asia/Kolkata", label: TIMEZONE_LABELS["Asia/Kolkata"] },
    { value: "Asia/Dubai", label: TIMEZONE_LABELS["Asia/Dubai"] },
    { value: "Europe/London", label: TIMEZONE_LABELS["Europe/London"] },
    { value: "America/New_York", label: TIMEZONE_LABELS["America/New_York"] },
  ]);
}

/** @deprecated Use `buildLocaleOptions(installLocale)` in client forms. */
export const LOCALE_OPTIONS = buildLocaleOptions("en-US");

/** @deprecated Use `buildTimezoneOptions(installTimezone)` in client forms. */
export const TIMEZONE_OPTIONS = buildTimezoneOptions("UTC");
