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
