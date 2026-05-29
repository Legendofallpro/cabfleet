"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { VehicleStatus, VehicleType } from "@prisma/client";

import { TextField } from "@/components/common/form/TextField";
import { SelectField } from "@/components/common/form/SelectField";
import { FormActions } from "@/components/common/FormActions";
import {
 vehicleInputSchema,
 type VehicleFormValues,
} from "@/modules/vehicles/validators/vehicle";
import {
 createVehicleAction,
 updateVehicleAction,
} from "@/modules/vehicles/actions/vehicle.actions";

const STATUS_OPTIONS = Object.values(VehicleStatus).map((v) => ({
 value: v,
 label: v.replaceAll("_", " "),
}));
const TYPE_OPTIONS = Object.values(VehicleType).map((v) => ({
 value: v,
 label: v.charAt(0) + v.slice(1).toLowerCase(),
}));

type Branch = { id: string; name: string; code: string };

type Props = {
 mode: "create" | "edit";
 branches: Branch[];
 defaultValues?: Partial<VehicleFormValues> & { id?: string };
};

export function VehicleForm({ mode, branches, defaultValues }: Props) {
 const router = useRouter();
 const {
  register,
  handleSubmit,
  setError,
  formState: { errors, isSubmitting },
 } = useForm<VehicleFormValues>({
  resolver: zodResolver(vehicleInputSchema),
  defaultValues: {
   branchId: defaultValues?.branchId ?? branches[0]?.id ?? "",
   registrationNumber: defaultValues?.registrationNumber ?? "",
   make: defaultValues?.make ?? "",
   model: defaultValues?.model ?? "",
   year: defaultValues?.year ?? new Date().getFullYear(),
   color: defaultValues?.color ?? "",
   type: defaultValues?.type ?? VehicleType.SEDAN,
   capacity: defaultValues?.capacity ?? 4,
   status: defaultValues?.status ?? VehicleStatus.AVAILABLE,
   insuranceExpiry: defaultValues?.insuranceExpiry ?? "",
   fitnessExpiry: defaultValues?.fitnessExpiry ?? "",
   pucExpiry: defaultValues?.pucExpiry ?? "",
   odometer: defaultValues?.odometer ?? 0,
   notes: defaultValues?.notes ?? "",
  },
 });

 async function onSubmit(values: VehicleFormValues) {
  const payload = mode === "edit" ? { ...values, id: defaultValues?.id } : values;
  const result =
   mode === "edit"
    ? await updateVehicleAction(payload)
    : await createVehicleAction(payload);

  if (!result.ok) {
   if (result.error.fieldErrors) {
    for (const [field, msgs] of Object.entries(result.error.fieldErrors)) {
     setError(field as keyof VehicleFormValues, { message: msgs?.[0] });
    }
   }
   toast.error(result.error.message);
   return;
  }

  toast.success(mode === "edit" ? "Vehicle updated." : "Vehicle added.");
  router.push("/vehicles");
  router.refresh();
 }

 return (
  <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
   <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
    <SelectField
     label="Branch"
     required
     options={branches.map((b) => ({ value: b.id, label: `${b.name} (${b.code})` }))}
     {...register("branchId")}
     error={errors.branchId?.message}
    />
    <TextField
     label="Registration number"
     required
     placeholder="MH-01-AB-1234"
     {...register("registrationNumber")}
     error={errors.registrationNumber?.message}
    />
    <TextField label="Make" required {...register("make")} error={errors.make?.message} />
    <TextField label="Model" required {...register("model")} error={errors.model?.message} />
    <TextField
     label="Year"
     type="number"
     {...register("year")}
     error={errors.year?.message}
    />
    <TextField label="Color" {...register("color")} error={errors.color?.message} />
    <SelectField
     label="Type"
     options={TYPE_OPTIONS}
     {...register("type")}
     error={errors.type?.message}
    />
    <TextField
     label="Capacity"
     type="number"
     {...register("capacity")}
     error={errors.capacity?.message}
    />
    <SelectField
     label="Status"
     options={STATUS_OPTIONS}
     {...register("status")}
     error={errors.status?.message}
    />
    <TextField
     label="Odometer"
     type="number"
     {...register("odometer")}
     error={errors.odometer?.message}
    />
    <TextField
     label="Insurance expiry"
     type="date"
     {...register("insuranceExpiry")}
     error={errors.insuranceExpiry?.message as string | undefined}
    />
    <TextField
     label="Fitness expiry"
     type="date"
     {...register("fitnessExpiry")}
     error={errors.fitnessExpiry?.message as string | undefined}
    />
    <TextField
     label="PUC expiry"
     type="date"
     {...register("pucExpiry")}
     error={errors.pucExpiry?.message as string | undefined}
    />
    <div className="md:col-span-2">
     <TextField label="Notes" {...register("notes")} error={errors.notes?.message} />
    </div>
   </div>
   <FormActions cancelHref="/vehicles" submitting={isSubmitting} />
  </form>
 );
}
