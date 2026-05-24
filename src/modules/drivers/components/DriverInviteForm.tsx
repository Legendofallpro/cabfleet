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
  inviteDriverSchema,
  type InviteDriverFormValues,
} from "@/modules/drivers/validators/driver";
import { inviteDriverAction } from "@/modules/drivers/actions/driver.actions";

const STATUS_OPTIONS = Object.values(DriverStatus).map((v) => ({
  value: v,
  label: v.replaceAll("_", " "),
}));
const VERIFY_OPTIONS = Object.values(DriverVerificationStatus).map((v) => ({
  value: v,
  label: v.replaceAll("_", " "),
}));

type Branch = { id: string; name: string; code: string };

export function DriverInviteForm({ branches }: { branches: Branch[] }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<InviteDriverFormValues>({
    resolver: zodResolver(inviteDriverSchema),
    defaultValues: {
      email: "",
      fullName: "",
      phone: "",
      branchId: branches[0]?.id ?? "",
      licenseNumber: "",
      licenseExpiry: "",
      status: DriverStatus.ACTIVE,
      verification: DriverVerificationStatus.PENDING,
      notes: "",
    },
  });

  async function onSubmit(values: InviteDriverFormValues) {
    const result = await inviteDriverAction(values);
    if (!result.ok) {
      if (result.error.fieldErrors) {
        for (const [field, msgs] of Object.entries(result.error.fieldErrors)) {
          setError(field as keyof InviteDriverFormValues, { message: msgs?.[0] });
        }
      }
      toast.error(result.error.message);
      return;
    }
    toast.success("Driver invited. They will receive an email to set their password.");
    router.push("/drivers");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <TextField
          label="Email"
          type="email"
          required
          {...register("email")}
          error={errors.email?.message as string | undefined}
          hint="An invite link will be emailed to this address."
        />
        <TextField
          label="Full name"
          required
          {...register("fullName")}
          error={errors.fullName?.message}
        />
        <TextField
          label="Phone"
          required
          {...register("phone")}
          error={errors.phone?.message}
        />
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
        <SelectField
          label="Status"
          options={STATUS_OPTIONS}
          {...register("status")}
          error={errors.status?.message}
        />
        <SelectField
          label="Verification"
          options={VERIFY_OPTIONS}
          {...register("verification")}
          error={errors.verification?.message}
        />
        <div className="md:col-span-2">
          <TextField label="Notes" {...register("notes")} error={errors.notes?.message} />
        </div>
      </div>
      <FormActions cancelHref="/drivers" submitting={isSubmitting} submitLabel="Send invite" />
    </form>
  );
}
