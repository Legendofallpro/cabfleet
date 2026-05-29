"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { toast } from "sonner";

import { TextField } from "@/components/common/form/TextField";
import { SelectField } from "@/components/common/form/SelectField";
import { TextareaField } from "@/components/common/form/TextareaField";
import { createExpenseAction } from "@/modules/expenses/actions/expense.actions";
import {
  createExpenseSchema,
  EXPENSE_CATEGORIES,
  type ExpenseFormValues,
} from "@/modules/expenses/validators/expense";

interface Props {
  vehicleId?: string;
  profileId?: string;
  onSuccess?: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  FUEL: "Fuel",
  MAINTENANCE: "Maintenance",
  TOLL: "Toll",
  PARKING: "Parking",
  INSURANCE: "Insurance",
  REGISTRATION: "Registration",
  MISC: "Miscellaneous",
};

export function ExpenseForm({ vehicleId, profileId, onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: { vehicleId: vehicleId ?? "", profileId: profileId ?? "" },
  });

  const onSubmit = async (values: ExpenseFormValues) => {
    setSubmitting(true);
    try {
      const result = await createExpenseAction(values);
      if (!result.ok) {
        if (result.error.fieldErrors) {
          for (const [field, msgs] of Object.entries(result.error.fieldErrors)) {
            setError(field as keyof ExpenseFormValues, { message: msgs[0] });
          }
        } else {
          toast.error(result.error.message);
        }
        return;
      }
      toast.success("Expense recorded.");
      reset({ vehicleId: vehicleId ?? "", profileId: profileId ?? "" });
      onSuccess?.();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {vehicleId && <input type="hidden" {...register("vehicleId")} />}
      {profileId && <input type="hidden" {...register("profileId")} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          label="Category"
          error={errors.category?.message}
          options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] ?? c }))}
          {...register("category")}
        />
        <TextField
          label="Amount (₹)"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="e.g. 1500.00"
          error={errors.amount?.message}
          {...register("amount")}
        />
        <TextField
          label="Date &amp; Time"
          type="datetime-local"
          error={errors.at?.message}
          {...register("at")}
        />
        <TextField
          label="Receipt URL (optional)"
          type="url"
          placeholder="https://..."
          error={errors.receiptUrl?.message}
          {...register("receiptUrl")}
        />
      </div>

      <TextareaField
        label="Notes (optional)"
        rows={2}
        placeholder="e.g. Petrol fill-up on highway"
        error={errors.notes?.message}
        {...register("notes")}
      />

      <div className="flex items-center justify-end pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Add Expense"}
        </button>
      </div>
    </form>
  );
}
