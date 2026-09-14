import { z } from "zod";
import { DispatchMode } from "@prisma/client";

export const createBookingTypeSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(300).optional().nullable(),
  defaultDispatchMode: z.enum(DispatchMode).default(DispatchMode.MANUAL),
  active: z.boolean().default(true),
});

export type CreateBookingTypeFormValues = z.input<typeof createBookingTypeSchema>;
export type CreateBookingTypeInput = z.infer<typeof createBookingTypeSchema>;

export const deleteBookingTypeSchema = z.object({
  id: z.string().min(1),
});
