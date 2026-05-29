"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { DriverStatus, DriverVerificationStatus } from "@prisma/client";

import { TextField } from "@/components/common/form/TextField";
import { SelectField } from "@/components/common/form/SelectField";
import { FormActions } from "@/components/common/FormActions";
import {
 updateDriverSchema,
 type UpdateDriverFormValues,
} from "@/modules/drivers/validators/driver";
import { updateDriverAction } from "@/modules/drivers/actions/driver.actions";

const STATUS_OPTIONS = Object.values(DriverStatus).map((v) => ({
 value: v,
 label: v.replaceAll("_", " "),
}));
const VERIFY_OPTIONS = Object.values(DriverVerificationStatus).map((v) => ({
 value: v,
 label: v.replaceAll("_", " "),
}));

type Branch = { id: string; name: string; code: string };

export function DriverEditForm({
 branches,
 defaultValues,
}: {
 branches: Branch[];
 defaultValues: UpdateDriverFormValues;
}) {
 const router = useRouter();
 const {
  register,
  handleSubmit,
  setError,
  formState: { errors, isSubmitting },
 } = useForm<UpdateDriverFormValues>({
  resolver: zodResolver(updateDriverSchema),
  defaultValues,
 });

 async function onSubmit(values: UpdateDriverFormValues) {
  const result = await updateDriverAction(values);
  if (!result.ok) {
   if (result.error.fieldErrors) {
    for (const [field, msgs] of Object.entries(result.error.fieldErrors)) {
     setError(field as keyof UpdateDriverFormValues, { message: msgs?.[0] });
    }
   }
   toast.error(result.error.message);
   return;
  }
  toast.success("Driver updated.");
  router.push("/drivers");
  router.refresh();
 }

 return (
  <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
   <input type="hidden" {...register("id")} />
   <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
    <TextField label="Full name" required {...register("fullName")} error={errors.fullName?.message} />
    <TextField label="Phone" required {...register("phone")} error={errors.phone?.message} />
    <SelectField
     label="Branch"
     required
     options={branches.map((b) => ({ value: b.id, label: `${b.name} (${b.code})` }))}
     {...register("branchId")}
     error={errors.branchId?.message}
    />
    <TextField
     label="License number"
     required
     {...register("licenseNumber")}
     error={errors.licenseNumber?.message}
    />
    <TextField
     label="License expiry"
     type="date"
     required
     {...register("licenseExpiry")}
     error={errors.licenseExpiry?.message as string | undefined}
    />
    <SelectField label="Status" options={STATUS_OPTIONS} {...register("status")} error={errors.status?.message} />
    <SelectField label="Verification" options={VERIFY_OPTIONS} {...register("verification")} error={errors.verification?.message} />
    <div className="md:col-span-2">
     <TextField label="Notes" {...register("notes")} error={errors.notes?.message} />
    </div>
   </div>
   <FormActions cancelHref="/drivers" submitting={isSubmitting} />
  </form>
 );
}
