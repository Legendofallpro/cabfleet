"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { toast } from "sonner";

import { TextField } from "@/components/common/form/TextField";
import { SelectField } from "@/components/common/form/SelectField";
import { TextareaField } from "@/components/common/form/TextareaField";
import { createShiftAction } from "@/modules/shifts/actions/shift.actions";
import {
  createShiftSchema,
  type ShiftFormValues,
} from "@/modules/shifts/validators/shift";

interface Option {
  value: string;
  label: string;
}

interface Props {
  branches: Option[];
  staffOptions: Option[];
  onSuccess?: () => void;
}

export function ShiftForm({ branches, staffOptions, onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ShiftFormValues>({
    resolver: zodResolver(createShiftSchema),
    defaultValues: { branchId: "", staffId: "", notes: "" },
  });

  const onSubmit = async (values: ShiftFormValues) => {
    setSubmitting(true);
    try {
      const result = await createShiftAction(values);
      if (!result.ok) {
        if (result.error.fieldErrors) {
          for (const [field, msgs] of Object.entries(result.error.fieldErrors)) {
            setError(field as keyof ShiftFormValues, { message: msgs[0] });
          }
        } else {
          toast.error(result.error.message);
        }
        return;
      }
      toast.success("Shift created.");
      reset({ branchId: "", staffId: "", notes: "" });
      onSuccess?.();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          label="Branch"
          error={errors.branchId?.message}
          options={[{ value: "", label: "— Select branch —" }, ...branches]}
          {...register("branchId")}
        />
        <SelectField
          label="Staff (optional)"
          error={errors.staffId?.message}
          options={[{ value: "", label: "— Unassigned —" }, ...staffOptions]}
          {...register("staffId")}
        />
        <TextField
          label="Starts At"
          type="datetime-local"
          error={errors.startsAt?.message}
          {...register("startsAt")}
        />
        <TextField
          label="Ends At"
          type="datetime-local"
          error={errors.endsAt?.message}
          {...register("endsAt")}
        />
      </div>

      <TextareaField
        label="Notes (optional)"
        rows={2}
        placeholder="e.g. Night shift, Gate B"
        error={errors.notes?.message}
        {...register("notes")}
      />

      <div className="flex items-center justify-end pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Create Shift"}
        </button>
      </div>
    </form>
  );
}
