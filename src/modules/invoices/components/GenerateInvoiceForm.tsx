"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { TextField } from "@/components/common/form/TextField";
import { FormActions } from "@/components/common/FormActions";
import { generateInvoiceAction } from "@/modules/invoices/actions/invoice.actions";
import {
  generateInvoiceSchema,
  type GenerateInvoiceFormValues,
} from "@/modules/invoices/validators/invoice";

interface Props {
  bookingId: string;
}

export function GenerateInvoiceForm({ bookingId }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<GenerateInvoiceFormValues>({
    resolver: zodResolver(generateInvoiceSchema),
    defaultValues: { bookingId },
  });

  const onSubmit = async (values: GenerateInvoiceFormValues) => {
    setSubmitting(true);
    try {
      const result = await generateInvoiceAction(values);
      if (!result.ok) {
        if (result.error.fieldErrors) {
          for (const [field, msgs] of Object.entries(result.error.fieldErrors)) {
            setError(field as keyof GenerateInvoiceFormValues, { message: msgs[0] });
          }
        } else {
          toast.error(result.error.message);
        }
        return;
      }
      toast.success("Invoice generated and emailed to customer.");
      router.push(`/invoices/${result.data.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <input type="hidden" {...register("bookingId")} />

      <TextField
        label="Due date (optional)"
        type="date"
        error={errors.dueAt?.message}
        {...register("dueAt")}
      />

      <FormActions
        cancelHref={`/bookings/${bookingId}`}
        submitting={submitting}
        submitLabel="Generate Invoice"
      />
    </form>
  );
}
