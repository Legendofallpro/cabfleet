"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DispatchMode } from "@prisma/client";
import {
  createDispatchRuleSchema,
  type CreateDispatchRuleFormValues,
} from "@/modules/dispatch/validators/dispatch-rule";
import { createDispatchRuleAction } from "@/modules/dispatch/actions/dispatch-rule.actions";
import { DISPATCH_MODE_LABEL } from "@/modules/bookings/booking.constants";

type Props = {
  branches: { id: string; name: string; code: string }[];
  bookingTypes: { id: string; name: string }[];
  onSuccess?: () => void;
};

export function CreateDispatchRuleForm({ branches, bookingTypes, onSuccess }: Props) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateDispatchRuleFormValues>({
    resolver: zodResolver(createDispatchRuleSchema),
    defaultValues: { priority: 100, mode: DispatchMode.MANUAL, active: true },
  });

  const selectedMode = useWatch({ control, name: "mode" });

  async function onSubmit(values: CreateDispatchRuleFormValues) {
    const result = await createDispatchRuleAction(values);
    if (!result.ok) {
      if (result.error.fieldErrors) {
        for (const [field, msgs] of Object.entries(result.error.fieldErrors)) {
          setError(field as keyof CreateDispatchRuleFormValues, {
            message: msgs[0],
          });
        }
      }
      return;
    }
    reset();
    onSuccess?.();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {/* Priority */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
            Priority <span className="text-gray-400">(lower = higher)</span>
          </label>
          <input
            type="number"
            {...register("priority")}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          {errors.priority && (
            <p className="mt-1 text-xs text-red-500">{errors.priority.message}</p>
          )}
        </div>

        {/* Mode */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
            Dispatch Mode
          </label>
          <select
            {...register("mode")}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            {Object.values(DispatchMode).map((m) => (
              <option key={m} value={m}>
                {DISPATCH_MODE_LABEL[m]}
              </option>
            ))}
          </select>
          {errors.mode && (
            <p className="mt-1 text-xs text-red-500">{errors.mode.message}</p>
          )}
        </div>

        {/* Hybrid timeout */}
        {selectedMode === DispatchMode.HYBRID && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              Timeout (mins)
            </label>
            <input
              type="number"
              {...register("hybridTimeoutMins")}
              placeholder="5"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Branch (optional) */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
            Branch <span className="text-gray-400">(blank = any)</span>
          </label>
          <select
            {...register("branchId")}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="">Any branch</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>
        </div>

        {/* Booking type (optional) */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
            Booking Type <span className="text-gray-400">(blank = any)</span>
          </label>
          <select
            {...register("bookingTypeId")}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="">Any type</option>
            {bookingTypes.map((bt) => (
              <option key={bt.id} value={bt.id}>
                {bt.name}
              </option>
            ))}
          </select>
        </div>

        {/* Customer segment */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
            Customer Segment <span className="text-gray-400">(blank = any)</span>
          </label>
          <input
            type="text"
            {...register("customerSegment")}
            placeholder="e.g. corporate"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="active"
          {...register("active")}
          className="h-4 w-4 rounded border-gray-300"
        />
        <label htmlFor="active" className="text-sm text-gray-600 dark:text-gray-400">
          Active
        </label>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:opacity-60"
      >
        {isSubmitting ? "Creating…" : "Add Rule"}
      </button>
    </form>
  );
}
