import { z } from "zod";
import { DispatchMode } from "@prisma/client";

export const branchInputSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(16, "Code must be at most 16 characters")
    .regex(/^[A-Z0-9_-]+$/i, "Letters, numbers, dash and underscore only"),
  timezone: z.string().min(1).default("UTC"),
  address: z.string().max(255).optional().nullable(),
  phone: z.string().max(32).optional().nullable(),
  email: z.email().optional().nullable().or(z.literal("")),
  defaultDispatch: z.enum(DispatchMode).default(DispatchMode.MANUAL),
  active: z.boolean().default(true),
});

export type BranchFormValues = z.input<typeof branchInputSchema>;
export type BranchInput = z.infer<typeof branchInputSchema>;

export const createBranchSchema = branchInputSchema;
export const updateBranchSchema = branchInputSchema.extend({
  id: z.string().min(1),
});

export type UpdateBranchFormValues = z.input<typeof updateBranchSchema>;
