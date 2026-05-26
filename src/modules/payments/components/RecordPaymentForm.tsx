"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { TextField } from "@/components/common/form/TextField";
import { SelectField } from "@/components/common/form/SelectField";
import { FormActions } from "@/components/common/FormActions";
import { createPaymentAction } from "@/modules/payments/actions/payment.actions";
import {
  createPaymentSchema,
  type PaymentFormValues,
} from "@/modules/payments/validators/payment";

const METHOD_OPTIONS = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "UPI", label: "UPI" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CHEQUE", label: "Cheque" },
];

interface Props {
  bookingId: string;
  defaultAmount?: number;
}

export function RecordPaymentForm({ bookingId, defaultAmount }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(createPaymentSchema),
    defaultValues: {
      bookingId,
      amount: defaultAmount ?? undefined,
      method: "CASH",
    },
  });

  const onSubmit = async (values: PaymentFormValues) => {
    setSubmitting(true);
    try {
      const result = await createPaymentAction(values);
      if (!result.ok) {
        if (result.error.fieldErrors) {
          for (const [field, msgs] of Object.entries(result.error.fieldErrors)) {
            setError(field as keyof PaymentFormValues, { message: msgs[0] });
          }
        } else {
          toast.error(result.error.message);
        }
        return;
      }
      toast.success("Payment recorded successfully.");
      router.push(`/payments/${result.data.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <input type="hidden" {...register("bookingId")} />

      <TextField
        label="Amount (₹)"
        type="number"
        step="0.01"
        min="0.01"
        placeholder="0.00"
        error={errors.amount?.message}
        {...register("amount")}
      />

      <SelectField
        label="Payment method"
        error={errors.method?.message}
        options={METHOD_OPTIONS}
        {...register("method")}
      />

      <TextField
        label="Transaction reference (optional)"
        placeholder="e.g. UPI transaction ID"
        error={errors.txnRef?.message}
        {...register("txnRef")}
      />

      <FormActions
        cancelHref="/payments"
        submitting={submitting}
        submitLabel="Record Payment"
      />
    </form>
  );
}
