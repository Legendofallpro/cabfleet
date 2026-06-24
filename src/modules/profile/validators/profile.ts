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

export const LOCALE_OPTIONS = [
  { value: "en-IN", label: "English (India)" },
  { value: "hi-IN", label: "Hindi (India)" },
] as const;

export const TIMEZONE_OPTIONS = [
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "America/New_York", label: "America/New_York (ET)" },
] as const;
