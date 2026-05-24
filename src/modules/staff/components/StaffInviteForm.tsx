"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Role, StaffDesignation, StaffStatus } from "@prisma/client";

import { TextField } from "@/components/common/form/TextField";
import { SelectField } from "@/components/common/form/SelectField";
import { FormActions } from "@/components/common/FormActions";
import {
  inviteStaffSchema,
  type InviteStaffFormValues,
} from "@/modules/staff/validators/staff";
import { inviteStaffAction } from "@/modules/staff/actions/staff.actions";

const DESIGNATION_OPTIONS = Object.values(StaffDesignation).map((v) => ({
  value: v,
  label: v.charAt(0) + v.slice(1).toLowerCase(),
}));
const STATUS_OPTIONS = Object.values(StaffStatus).map((v) => ({
  value: v,
  label: v.replaceAll("_", " "),
}));
const ROLE_OPTIONS = [
  { value: Role.STAFF, label: "Staff" },
  { value: Role.ADMIN, label: "Admin" },
];

type Branch = { id: string; name: string; code: string };

export function StaffInviteForm({ branches }: { branches: Branch[] }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<InviteStaffFormValues>({
    resolver: zodResolver(inviteStaffSchema),
    defaultValues: {
      email: "",
      fullName: "",
      phone: "",
      branchId: branches[0]?.id ?? "",
      employeeId: "",
      designation: StaffDesignation.SUPPORT,
      status: StaffStatus.ACTIVE,
      role: Role.STAFF,
      notes: "",
    },
  });

  async function onSubmit(values: InviteStaffFormValues) {
    const result = await inviteStaffAction(values);
    if (!result.ok) {
      if (result.error.fieldErrors) {
        for (const [field, msgs] of Object.entries(result.error.fieldErrors)) {
          setError(field as keyof InviteStaffFormValues, { message: msgs?.[0] });
        }
      }
      toast.error(result.error.message);
      return;
    }
    toast.success("Staff invited.");
    router.push("/staff");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <TextField label="Email" type="email" required {...register("email")} error={errors.email?.message as string | undefined} />
        <TextField label="Full name" required {...register("fullName")} error={errors.fullName?.message} />
        <TextField label="Phone" {...register("phone")} error={errors.phone?.message} />
        <SelectField
          label="Branch"
          required
          options={branches.map((b) => ({ value: b.id, label: `${b.name} (${b.code})` }))}
          {...register("branchId")}
          error={errors.branchId?.message}
        />
        <TextField label="Employee ID" required {...register("employeeId")} error={errors.employeeId?.message} />
        <SelectField label="Designation" options={DESIGNATION_OPTIONS} {...register("designation")} error={errors.designation?.message} />
        <SelectField label="Role" options={ROLE_OPTIONS} {...register("role")} error={errors.role?.message} />
        <SelectField label="Status" options={STATUS_OPTIONS} {...register("status")} error={errors.status?.message} />
        <div className="md:col-span-2">
          <TextField label="Notes" {...register("notes")} error={errors.notes?.message} />
        </div>
      </div>
      <FormActions cancelHref="/staff" submitting={isSubmitting} submitLabel="Send invite" />
    </form>
  );
}
