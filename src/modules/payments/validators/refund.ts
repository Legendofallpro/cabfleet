import { z } from "zod";

export const requestRefundSchema = z.object({
  paymentId: z.string().min(1),
  amount: z.coerce.number().positive("Amount must be greater than zero."),
  reason: z.string().min(3, "Provide a brief reason for the refund.").max(500),
});
export type RequestRefundFormValues = z.input<typeof requestRefundSchema>;
export type RequestRefundInput = z.infer<typeof requestRefundSchema>;

export const refundDecisionSchema = z.object({
  refundId: z.string().min(1),
});
export type RefundDecisionInput = z.infer<typeof refundDecisionSchema>;

export const rejectRefundSchema = refundDecisionSchema.extend({
  reason: z.string().min(3, "Provide a brief rejection reason.").max(500),
});
export type RejectRefundInput = z.infer<typeof rejectRefundSchema>;
