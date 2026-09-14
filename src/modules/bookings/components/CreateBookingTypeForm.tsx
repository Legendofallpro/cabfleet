"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DispatchMode } from "@prisma/client";
import { toast } from "sonner";
import { TextField } from "@/components/common/form/TextField";
import { SelectField } from "@/components/common/form/SelectField";
import { DISPATCH_MODE_LABEL } from "@/modules/bookings/booking.constants";
import {
  createBookingTypeSchema,
  type CreateBookingTypeFormValues,
} from "@/modules/bookings/validators/booking-type";
import { createBookingTypeAction } from "@/modules/bookings/actions/booking-type.actions";

export function CreateBookingTypeForm() {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateBookingTypeFormValues>({
    resolver: zodResolver(createBookingTypeSchema),
    defaultValues: {
      name: "",
      description: "",
      defaultDispatchMode: DispatchMode.MANUAL,
      active: true,
    },
  });

  async function onSubmit(values: CreateBookingTypeFormValues) {
    const result = await createBookingTypeAction(values);
    if (!result.ok) {
      if (result.error.fieldErrors) {
        for (const [field, msgs] of Object.entries(result.error.fieldErrors)) {
          setError(field as keyof CreateBookingTypeFormValues, { message: msgs[0] });
        }
      }
      toast.error(result.error.message);
      return;
    }
    toast.success("Booking type saved.");
    reset();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <TextField label="Name" required error={errors.name?.message} {...register("name")} />
      <TextField label="Description" error={errors.description?.message} {...register("description")} />
      <SelectField
        label="Default dispatch"
        options={Object.values(DispatchMode).map((m) => ({
          value: m,
          label: DISPATCH_MODE_LABEL[m],
        }))}
        error={errors.defaultDispatchMode?.message}
        {...register("defaultDispatchMode")}
      />
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
      >
        {isSubmitting ? "Saving…" : "Add type"}
      </button>
    </form>
  );
}
