"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { TextField } from "@/components/common/form/TextField";
import { SelectField } from "@/components/common/form/SelectField";
import {
  createPricingRuleSchema,
  type CreatePricingRuleFormValues,
} from "@/modules/pricing/validators/pricing-rule";
import { createPricingRuleAction } from "@/modules/pricing/actions/pricing-rule.actions";
import { useRequiredInstallSettings } from "@/modules/install/components/InstallSettingsProvider";

type Props = {
  branches: { id: string; name: string; code: string }[];
  bookingTypes: { id: string; name: string }[];
};

export function CreatePricingRuleForm({ branches, bookingTypes }: Props) {
  const settings = useRequiredInstallSettings();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreatePricingRuleFormValues>({
    resolver: zodResolver(createPricingRuleSchema),
    defaultValues: {
      bookingTypeId: bookingTypes[0]?.id ?? "",
      branchId: "",
      baseFare: 50,
      perKm: 14,
      perMin: 1,
    },
  });

  async function onSubmit(values: CreatePricingRuleFormValues) {
    const result = await createPricingRuleAction({
      ...values,
      branchId: values.branchId || null,
    });
    if (!result.ok) {
      if (result.error.fieldErrors) {
        for (const [field, msgs] of Object.entries(result.error.fieldErrors)) {
          setError(field as keyof CreatePricingRuleFormValues, { message: msgs[0] });
        }
      }
      toast.error(result.error.message);
      return;
    }
    toast.success("Pricing rule saved.");
    reset();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <SelectField
        label="Booking type"
        required
        options={bookingTypes.map((t) => ({ value: t.id, label: t.name }))}
        error={errors.bookingTypeId?.message}
        {...register("bookingTypeId")}
      />
      <SelectField
        label="Branch"
        placeholder="All branches"
        options={[
          { value: "", label: "All branches" },
          ...branches.map((b) => ({ value: b.id, label: `${b.name} (${b.code})` })),
        ]}
        error={errors.branchId?.message}
        {...register("branchId")}
      />
      <div className="grid grid-cols-3 gap-4">
        <TextField
          label={`Base (${settings.currency})`}
          type="number"
          min={0}
          required
          error={errors.baseFare?.message}
          {...register("baseFare")}
        />
        <TextField
          label={`Per km (${settings.currency})`}
          type="number"
          min={0}
          required
          error={errors.perKm?.message}
          {...register("perKm")}
        />
        <TextField
          label={`Per min (${settings.currency})`}
          type="number"
          min={0}
          required
          error={errors.perMin?.message}
          {...register("perMin")}
        />
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
      >
        {isSubmitting ? "Saving…" : "Add rule"}
      </button>
    </form>
  );
}
