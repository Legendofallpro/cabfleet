"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { FormActions } from "@/components/common/FormActions";
import { SelectField } from "@/components/common/form/SelectField";
import { updateLocaleAction } from "@/modules/profile/actions/profile.actions";
import {
  buildLocaleOptions,
  updateLocaleSchema,
  type UpdateLocaleFormValues,
} from "@/modules/profile/validators/profile";
import { useInstallSettings } from "@/modules/install/components/InstallSettingsProvider";

type Props = {
  defaultValues: UpdateLocaleFormValues;
  cancelHref?: string;
};

export function LocaleForm({ defaultValues, cancelHref = "/profile/account" }: Props) {
  const installLocale = useInstallSettings()?.locale ?? "en-US";
  const localeOptions = buildLocaleOptions(installLocale);
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UpdateLocaleFormValues>({
    resolver: zodResolver(updateLocaleSchema),
    defaultValues,
  });

  async function onSubmit(values: UpdateLocaleFormValues) {
    const result = await updateLocaleAction(values);
    if (!result.ok) {
      if (result.error.fieldErrors) {
        for (const [field, msgs] of Object.entries(result.error.fieldErrors)) {
          setError(field as keyof UpdateLocaleFormValues, { message: msgs?.[0] });
        }
      }
      toast.error(result.error.message);
      return;
    }
    toast.success("Language preference saved.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <SelectField
        label="Language"
        required
        options={localeOptions.map((o) => ({ value: o.value, label: o.label }))}
        {...register("locale")}
        error={errors.locale?.message}
        hint="Used for notifications and formatted dates."
      />
      <FormActions cancelHref={cancelHref} submitting={isSubmitting} submitLabel="Save language" />
    </form>
  );
}
