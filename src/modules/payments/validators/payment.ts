import { z } from "zod";

export const createPaymentSchema = z.object({
  bookingId: z.string().min(1, "Booking is required"),
  amount: z.coerce
    .number()
    .positive("Amount must be positive"),
  method: z.string().min(1, "Payment method is required"),
  txnRef: z.string().optional(),
  capturedAt: z.coerce.date().optional(),
});

export type PaymentFormValues = z.input<typeof createPaymentSchema>;
export type PaymentInput = z.infer<typeof createPaymentSchema>;
