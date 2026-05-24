"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { SelectField } from "@/components/common/form/SelectField";
import { TextareaField } from "@/components/common/form/TextareaField";
import { FormActions } from "@/components/common/FormActions";
import {
  assignDriverSchema,
  type AssignDriverFormValues,
} from "@/modules/bookings/validators/booking";
import { assignDriverAction } from "@/modules/bookings/actions/booking.actions";

type Driver = {
  id: string;
  licenseNumber: string;
  profile: { fullName: string | null; email: string };
};

type Vehicle = {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
};

type Props = {
  bookingId: string;
  drivers: Driver[];
  vehicles: Vehicle[];
  /** Pre-selected values when re-assigning */
  defaultDriverId?: string;
  defaultVehicleId?: string;
  onSuccess?: () => void;
};

export function BookingAssignForm({
  bookingId,
  drivers,
  vehicles,
  defaultDriverId = "",
  defaultVehicleId = "",
  onSuccess,
}: Props) {
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<AssignDriverFormValues>({
    resolver: zodResolver(assignDriverSchema),
    defaultValues: {
      bookingId,
      driverId: defaultDriverId,
      vehicleId: defaultVehicleId,
      reason: "",
    },
  });

  const onSubmit = (values: AssignDriverFormValues) => {
    startTransition(async () => {
      const result = await assignDriverAction(values);
      if (!result.ok) {
        if (result.error.fieldErrors) {
          Object.entries(result.error.fieldErrors).forEach(([field, msgs]) => {
            setError(field as keyof AssignDriverFormValues, { message: msgs[0] });
          });
        }
        toast.error(result.error.message);
        return;
      }
      toast.success("Driver assigned successfully.");
      onSuccess?.();
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register("bookingId")} />

      <SelectField
        label="Driver"
        required
        error={errors.driverId?.message}
        placeholder="Select a driver"
        options={drivers.map((d) => ({
          value: d.id,
          label: d.profile.fullName
            ? `${d.profile.fullName} (${d.licenseNumber})`
            : `${d.profile.email} (${d.licenseNumber})`,
        }))}
        {...register("driverId")}
      />

      <SelectField
        label="Vehicle"
        required
        error={errors.vehicleId?.message}
        placeholder="Select a vehicle"
        options={vehicles.map((v) => ({
          value: v.id,
          label: `${v.registrationNumber} — ${v.make} ${v.model}`,
        }))}
        {...register("vehicleId")}
      />

      <TextareaField
        label="Reason / Notes"
        placeholder="Optional: reason for this assignment"
        error={errors.reason?.message}
        {...register("reason")}
      />

      <FormActions cancelHref={`/bookings/${bookingId}`} submitting={pending} submitLabel="Assign" />
    </form>
  );
}
