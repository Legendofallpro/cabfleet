"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { TextField } from "@/components/common/form/TextField";
import { SelectField } from "@/components/common/form/SelectField";
import { FormActions } from "@/components/common/FormActions";
import {
  makeUpdateOrgGstSchema,
  type UpdateOrgGstFormValues,
} from "@/modules/orgs/validators/org";
import { updateOrgGstAction } from "@/modules/orgs/actions/org.actions";

type Props = {
  orgId: string;
  gstin: string | null;
  gstRate: number;
  country: string;
  taxIdLabel: string;
};

export function GstSettingsForm({
  orgId,
  gstin,
  gstRate,
  country,
  taxIdLabel,
}: Props) {
  const schema = makeUpdateOrgGstSchema(country);
  const isIndia = country === "IN";

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UpdateOrgGstFormValues>({
    resolver: zodResolver(schema),
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
    toast.success(
      isIndia
        ? "GST settings saved. New invoices will use these values."
        : "Tax settings saved. New invoices will use these values.",
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register("orgId")} />
      <TextField
        label={taxIdLabel}
        placeholder={isIndia ? "22AAAAA0000A1Z5" : undefined}
        maxLength={isIndia ? 15 : 32}
        hint={
          isIndia
            ? "Optional. Printed on invoices. Leave blank if you are not GST-registered."
            : "Optional. Printed on invoices. Leave blank if not registered."
        }
        error={errors.gstin?.message}
        {...register("gstin")}
      />
      <SelectField
        label={isIndia ? "GST rate" : "Tax rate"}
        required
        hint={
          isIndia
            ? "Rate 0 hides tax lines on the PDF. GST applies to the transport fare only, not toll or parking."
            : "Rate 0 hides tax lines on the PDF."
        }
        options={[
          { value: "0", label: "0% — no tax on invoices" },
          { value: "5", label: "5%" },
          { value: "12", label: "12%" },
          { value: "18", label: "18%" },
        ]}
        error={errors.gstRate?.message}
        {...register("gstRate")}
      />
      <FormActions
        cancelHref="/settings"
        submitting={isSubmitting}
        submitLabel={isIndia ? "Save GST settings" : "Save tax settings"}
      />
    </form>
  );
}
