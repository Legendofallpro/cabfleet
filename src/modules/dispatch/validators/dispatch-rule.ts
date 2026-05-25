import { z } from "zod";
import { DispatchMode } from "@prisma/client";

export const createDispatchRuleSchema = z.object({
  priority: z.coerce.number().int().min(1).max(9999).default(100),
  branchId: z.string().min(1).optional().nullable(),
  bookingTypeId: z.string().min(1).optional().nullable(),
  customerSegment: z.string().max(100).optional().nullable(),
  mode: z.enum(DispatchMode),
  /** For HYBRID mode: minutes before a PENDING booking is promoted. */
  hybridTimeoutMins: z.coerce.number().int().min(1).max(1440).optional().nullable(),
  active: z.boolean().default(true),
});

export type CreateDispatchRuleFormValues = z.input<typeof createDispatchRuleSchema>;
export type CreateDispatchRuleInput = z.infer<typeof createDispatchRuleSchema>;

export const deleteDispatchRuleSchema = z.object({
  id: z.string().min(1),
});
