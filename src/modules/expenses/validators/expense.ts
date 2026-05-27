import { z } from "zod";

export const EXPENSE_CATEGORIES = [
  "FUEL",
  "MAINTENANCE",
  "TOLL",
  "PARKING",
  "INSURANCE",
  "REGISTRATION",
  "MISC",
] as const;

export const createExpenseSchema = z.object({
  profileId: z.string().uuid().optional(),
  vehicleId: z.string().optional(),
  category: z.enum(EXPENSE_CATEGORIES),
  amount: z.coerce.number().positive("Amount must be positive"),
  receiptUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  notes: z.string().max(500).optional(),
  at: z.coerce.date().optional(),
});

export type ExpenseFormValues = z.input<typeof createExpenseSchema>;
export type ExpenseInput = z.infer<typeof createExpenseSchema>;
