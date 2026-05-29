import { z } from "zod";

export const createShiftSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  staffId: z.string().optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  notes: z.string().max(500).optional(),
}).refine((d) => d.endsAt > d.startsAt, {
  message: "End time must be after start time",
  path: ["endsAt"],
});

export const deleteShiftSchema = z.object({
  id: z.string().min(1),
});

export type ShiftFormValues = z.input<typeof createShiftSchema>;
export type ShiftInput = z.infer<typeof createShiftSchema>;
