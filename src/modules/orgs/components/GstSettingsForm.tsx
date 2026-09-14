"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { TextField } from "@/components/common/form/TextField";
import { SelectField } from "@/components/common/form/SelectField";
import { FormActions } from "@/components/common/FormActions";
import {
  updateOrgGstSchema,
  type UpdateOrgGstFormValues,
} from "@/modules/orgs/validators/org";
import { updateOrgGstAction } from "@/modules/orgs/actions/org.actions";

type Props = {
  orgId: string;
  gstin: string | null;
  gstRate: number;
};

export function GstSettingsForm({ orgId, gstin, gstRate }: Props) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UpdateOrgGstFormValues>({
    resolver: zodResolver(updateOrgGstSchema),
    defaultValues: {
      orgId,
      gstin: gstin ?? "",
      gstRate: String(gstRate),
    },
  });

  async function onSubmit(values: UpdateOrgGstFormValues) {
    const result = await updateOrgGstAction(values);
    if (!result.ok) {
      if (result.error.fieldErrors) {
        for (const [field, msgs] of Object.entries(result.error.fieldErrors)) {
          setError(field as keyof UpdateOrgGstFormValues, { message: msgs[0] });
        }
      }
      toast.error(result.error.message);
      return;
    }
    toast.success("GST settings saved. New invoices will use these values.");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register("orgId")} />
      <TextField
        label="GSTIN"
        placeholder="22AAAAA0000A1Z5"
        maxLength={15}
        hint="Optional. Printed on invoices. Leave blank if you are not GST-registered."
        error={errors.gstin?.message}
        {...register("gstin")}
      />
      <SelectField
        label="GST rate"
        required
        hint="Rate 0 hides tax lines on the PDF. GST applies to the transport fare only, not toll or parking."
        options={[
          { value: "0", label: "0% — no GST on invoices" },
          { value: "5", label: "5%" },
          { value: "12", label: "12%" },
        ]}
        error={errors.gstRate?.message}
        {...register("gstRate")}
      />
      <FormActions cancelHref="/settings" submitting={isSubmitting} submitLabel="Save GST settings" />
    </form>
  );
}
