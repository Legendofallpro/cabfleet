"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { toast } from "sonner";

import { TextField } from "@/components/common/form/TextField";
import { SelectField } from "@/components/common/form/SelectField";
import { TextareaField } from "@/components/common/form/TextareaField";
import { createFuelLogAction } from "@/modules/fuel/actions/fuel.actions";
import {
  createFuelLogSchema,
  type FuelLogFormValues,
} from "@/modules/fuel/validators/fuel";

interface DriverOption {
  value: string;
  label: string;
}

interface Props {
  vehicleId: string;
  drivers?: DriverOption[];
  onSuccess?: () => void;
  cancelHref?: string;
}

export function FuelLogForm({ vehicleId, drivers = [], onSuccess, cancelHref }: Props) {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FuelLogFormValues>({
    resolver: zodResolver(createFuelLogSchema),
    defaultValues: { vehicleId },
  });

  const onSubmit = async (values: FuelLogFormValues) => {
    setSubmitting(true);
    try {
      const result = await createFuelLogAction(values);
      if (!result.ok) {
        if (result.error.fieldErrors) {
          for (const [field, msgs] of Object.entries(result.error.fieldErrors)) {
            setError(field as keyof FuelLogFormValues, { message: msgs[0] });
          }
        } else {
          toast.error(result.error.message);
        }
        return;
      }
      toast.success("Fuel log added.");
      reset({ vehicleId });
      onSuccess?.();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register("vehicleId")} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          label="Litres"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="e.g. 40.00"
          error={errors.litres?.message}
          {...register("litres")}
        />
        <TextField
          label="Amount (₹)"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="e.g. 3200.00"
          error={errors.amount?.message}
          {...register("amount")}
        />
        <TextField
          label="Odometer (km)"
          type="number"
          min="0"
          placeholder="e.g. 52000"
          error={errors.odometer?.message}
          {...register("odometer")}
        />
        <TextField
          label="Date &amp; Time"
          type="datetime-local"
          error={errors.at?.message}
          {...register("at")}
        />
      </div>

      {drivers.length > 0 && (
        <SelectField
          label="Driver (optional)"
          error={errors.driverId?.message}
          options={[{ value: "", label: "— None —" }, ...drivers]}
          {...register("driverId")}
        />
      )}

      <TextareaField
        label="Notes (optional)"
        rows={2}
        placeholder="e.g. Full tank at highway pump"
        error={errors.notes?.message}
        {...register("notes")}
      />

      <div className="flex items-center justify-end gap-3 pt-2">
        {cancelHref && (
          <a
            href={cancelHref}
            className="inline-flex h-10 items-center rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
          >
            Cancel
          </a>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-10 items-center rounded-lg bg-brand-500 px-5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Add Fuel Log"}
        </button>
      </div>
    </form>
  );
}
