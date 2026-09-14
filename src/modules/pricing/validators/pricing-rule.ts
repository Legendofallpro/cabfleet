import { z } from "zod";

export const createPricingRuleSchema = z.object({
  bookingTypeId: z.string().min(1, "Booking type is required"),
  branchId: z.string().optional().nullable(),
  baseFare: z.coerce.number().min(0),
  perKm: z.coerce.number().min(0),
  perMin: z.coerce.number().min(0),
  validFrom: z.coerce.date().optional(),
  validTo: z.coerce.date().optional().nullable(),
});

export type CreatePricingRuleFormValues = z.input<typeof createPricingRuleSchema>;
export type CreatePricingRuleInput = z.infer<typeof createPricingRuleSchema>;

export const deletePricingRuleSchema = z.object({
  id: z.string().min(1),
});
