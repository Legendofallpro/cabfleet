"use client";

import { useEffect, useRef, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import { getPairedVehicleAction } from "@/modules/drivers/actions/vehicle-assignment.actions";

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
  control,
  setValue,
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

 const driverId = useWatch({ control, name: "driverId" });
 const seenDriverId = useRef<string | undefined>(undefined);

 useEffect(() => {
  if (!driverId) return;
  const isFirstRun = seenDriverId.current === undefined;
  seenDriverId.current = driverId;
  // Re-assign form already has the booking's vehicle. Don't clobber it on mount.
  if (isFirstRun && defaultVehicleId) return;

  let cancelled = false;
  const assignableIds = new Set(vehicles.map((v) => v.id));
  void getPairedVehicleAction({ driverId }).then((result) => {
   if (cancelled) return;
   if (!result.ok || !result.data.vehicleId) return;
   if (!assignableIds.has(result.data.vehicleId)) return;
   setValue("vehicleId", result.data.vehicleId);
  });
  return () => {
   cancelled = true;
  };
 }, [driverId, setValue, vehicles, defaultVehicleId]);

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
    hint="Paired roster vehicle is suggested when the driver has one."
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
