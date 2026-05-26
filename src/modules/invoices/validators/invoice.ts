import { z } from "zod";

export const generateInvoiceSchema = z.object({
  bookingId: z.string().min(1, "Booking is required"),
  dueAt: z.coerce.date().optional(),
});

export type GenerateInvoiceFormValues = z.input<typeof generateInvoiceSchema>;
export type GenerateInvoiceInput = z.infer<typeof generateInvoiceSchema>;
