"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { toast } from "sonner";

import { TextField } from "@/components/common/form/TextField";
import { SelectField } from "@/components/common/form/SelectField";
import { TextareaField } from "@/components/common/form/TextareaField";
import { createMaintenanceLogAction } from "@/modules/maintenance/actions/maintenance.actions";
import {
  createMaintenanceLogSchema,
  MAINTENANCE_TYPES,
  type MaintenanceLogFormValues,
} from "@/modules/maintenance/validators/maintenance";

const TYPE_OPTIONS = MAINTENANCE_TYPES.map((t) => ({
  value: t,
  label: t.replace(/_/g, " "),
}));

interface Props {
  vehicleId: string;
  onSuccess?: () => void;
  cancelHref?: string;
}

export function MaintenanceLogForm({ vehicleId, onSuccess, cancelHref }: Props) {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<MaintenanceLogFormValues>({
    resolver: zodResolver(createMaintenanceLogSchema),
    defaultValues: { vehicleId },
  });

  const onSubmit = async (values: MaintenanceLogFormValues) => {
    setSubmitting(true);
    try {
      const result = await createMaintenanceLogAction(values);
      if (!result.ok) {
        if (result.error.fieldErrors) {
          for (const [field, msgs] of Object.entries(result.error.fieldErrors)) {
            setError(field as keyof MaintenanceLogFormValues, { message: msgs[0] });
          }
        } else {
          toast.error(result.error.message);
        }
        return;
      }
      toast.success("Maintenance log added.");
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
        <SelectField
          label="Type"
          error={errors.type?.message}
          options={TYPE_OPTIONS}
          {...register("type")}
        />
        <TextField
          label="Cost (₹)"
          type="number"
          step="0.01"
          min="0"
          placeholder="e.g. 5000.00"
          error={errors.cost?.message}
          {...register("cost")}
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
          label="Next Due Odometer (optional)"
          type="number"
          min="0"
          placeholder="e.g. 57000"
          error={errors.nextDueOdometer?.message}
          {...register("nextDueOdometer")}
        />
        <TextField
          label="Date &amp; Time"
          type="datetime-local"
          error={errors.at?.message}
          {...register("at")}
        />
      </div>

      <TextareaField
        label="Notes (optional)"
        rows={2}
        placeholder="e.g. Full service at authorised centre"
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
          {submitting ? "Saving…" : "Add Maintenance Log"}
        </button>
      </div>
    </form>
  );
}
