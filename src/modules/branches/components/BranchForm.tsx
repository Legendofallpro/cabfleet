"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { DispatchMode } from "@prisma/client";

import { TextField } from "@/components/common/form/TextField";
import { SelectField } from "@/components/common/form/SelectField";
import { FormActions } from "@/components/common/FormActions";
import {
  branchInputSchema,
  type BranchFormValues,
} from "@/modules/branches/validators/branch";
import {
  createBranchAction,
  updateBranchAction,
} from "@/modules/branches/actions/branch.actions";

const DISPATCH_OPTIONS = [
  { value: DispatchMode.MANUAL, label: "Manual assignment" },
  { value: DispatchMode.CLAIM, label: "Driver claim" },
  { value: DispatchMode.HYBRID, label: "Hybrid" },
];

type Props = {
  mode: "create" | "edit";
  defaultValues?: Partial<BranchFormValues> & { id?: string };
};

export function BranchForm({ mode, defaultValues }: Props) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<BranchFormValues>({
    resolver: zodResolver(branchInputSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      code: defaultValues?.code ?? "",
      timezone: defaultValues?.timezone ?? "UTC",
      address: defaultValues?.address ?? "",
      phone: defaultValues?.phone ?? "",
      email: defaultValues?.email ?? "",
      defaultDispatch: defaultValues?.defaultDispatch ?? DispatchMode.MANUAL,
      active: defaultValues?.active ?? true,
    },
  });

  async function onSubmit(values: BranchFormValues) {
    const payload = mode === "edit" ? { ...values, id: defaultValues?.id } : values;
    const result =
      mode === "edit"
        ? await updateBranchAction(payload)
        : await createBranchAction(payload);

    if (!result.ok) {
      if (result.error.fieldErrors) {
        for (const [field, messages] of Object.entries(result.error.fieldErrors)) {
          setError(field as keyof BranchFormValues, { message: messages?.[0] });
        }
      }
      toast.error(result.error.message);
      return;
    }

    toast.success(mode === "edit" ? "Branch updated." : "Branch created.");
    router.push("/settings/branches");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <TextField
          label="Name"
          required
          placeholder="Mumbai HQ"
          {...register("name")}
          error={errors.name?.message}
        />
        <TextField
          label="Code"
          required
          placeholder="MUM-01"
          {...register("code")}
          error={errors.code?.message}
          hint="Short uppercase identifier."
        />
        <TextField
          label="Timezone"
          placeholder="Asia/Kolkata"
          {...register("timezone")}
          error={errors.timezone?.message}
        />
        <SelectField
          label="Default dispatch mode"
          options={DISPATCH_OPTIONS}
          {...register("defaultDispatch")}
          error={errors.defaultDispatch?.message}
        />
        <TextField
          label="Phone"
          {...register("phone")}
          error={errors.phone?.message}
        />
        <TextField
          label="Email"
          type="email"
          {...register("email")}
          error={errors.email?.message}
        />
        <div className="md:col-span-2">
          <TextField
            label="Address"
            {...register("address")}
            error={errors.address?.message}
          />
        </div>
        <div className="md:col-span-2 flex items-center gap-2">
          <input id="active" type="checkbox" {...register("active")} />
          <label htmlFor="active" className="text-sm text-gray-700 dark:text-gray-400">
            Active
          </label>
        </div>
      </div>
      <FormActions cancelHref="/settings/branches" submitting={isSubmitting} />
    </form>
  );
}
