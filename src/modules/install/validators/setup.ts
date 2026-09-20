import { z } from "zod";

export const completeSetupSchema = z.object({
  country: z.string().trim().length(2),
  currency: z.string().trim().min(3).max(3),
  locale: z.string().trim().min(2).max(16),
  timezone: z.string().trim().min(1).max(64),
  phoneRegion: z.string().trim().length(2),
  taxIdLabel: z.string().trim().min(1).max(32),
  taxRate: z.coerce.number().int().min(0).max(100),
  setupSecret: z.string().optional(),
});

export type CompleteSetupFormValues = z.input<typeof completeSetupSchema>;
export type CompleteSetupInput = z.infer<typeof completeSetupSchema>;
