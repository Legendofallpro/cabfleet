"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { SelectField } from "@/components/common/form/SelectField";
import { FormActions } from "@/components/common/FormActions";
import {
  assignVehicleSchema,
  type AssignVehicleFormValues,
} from "@/modules/drivers/validators/vehicle-assignment";
import { assignVehicleAction } from "@/modules/drivers/actions/vehicle-assignment.actions";

type Vehicle = { id: string; registrationNumber: string; make: string; model: string };

export function AssignVehicleForm({
  driverId,
  vehicles,
}: {
  driverId: string;
  vehicles: Vehicle[];
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AssignVehicleFormValues>({
    resolver: zodResolver(assignVehicleSchema),
    defaultValues: { driverId, vehicleId: vehicles[0]?.id ?? "" },
  });

  async function onSubmit(values: AssignVehicleFormValues) {
    const result = await assignVehicleAction(values);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Vehicle paired.");
  }

  if (vehicles.length === 0) {
    return <p className="text-sm text-muted">No vehicles in this branch.</p>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register("driverId")} />
      <SelectField
        label="Vehicle"
        required
        options={vehicles.map((v) => ({
          value: v.id,
          label: `${v.registrationNumber} · ${v.make} ${v.model}`,
        }))}
        error={errors.vehicleId?.message}
        {...register("vehicleId")}
      />
      <FormActions cancelHref={`/drivers/${driverId}`} submitting={isSubmitting} submitLabel="Pair vehicle" />
    </form>
  );
}
