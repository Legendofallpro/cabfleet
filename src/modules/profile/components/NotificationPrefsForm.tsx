"use client";

import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { FormActions } from "@/components/common/FormActions";
import { SelectField } from "@/components/common/form/SelectField";
import { SwitchField } from "@/components/common/form/SwitchField";
import { TextField } from "@/components/common/form/TextField";
import { updateNotificationPrefsAction } from "@/modules/profile/actions/profile.actions";
import { formatQuietHoursPreview } from "@/modules/profile/profile.constants";
import {
  TIMEZONE_OPTIONS,
  updateNotificationPrefsSchema,
  type UpdateNotificationPrefsFormValues,
} from "@/modules/profile/validators/profile";

type Props = {
  defaultValues: UpdateNotificationPrefsFormValues;
  cancelHref?: string;
};

export function NotificationPrefsForm({ defaultValues, cancelHref = "/profile/account" }: Props) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UpdateNotificationPrefsFormValues>({
    resolver: zodResolver(updateNotificationPrefsSchema),
    defaultValues,
  });

  const quietStart = useWatch({ control, name: "quietHoursStart" });
  const quietEnd = useWatch({ control, name: "quietHoursEnd" });
  const timezone = useWatch({ control, name: "timezone" });

  async function onSubmit(values: UpdateNotificationPrefsFormValues) {
    const result = await updateNotificationPrefsAction(values);
    if (!result.ok) {
      if (result.error.fieldErrors) {
        for (const [field, msgs] of Object.entries(result.error.fieldErrors)) {
          setError(field as keyof UpdateNotificationPrefsFormValues, { message: msgs?.[0] });
        }
      }
      toast.error(result.error.message);
      return;
    }
    toast.success("Notification preferences saved.");
  }

  const quietPreview = formatQuietHoursPreview(quietStart, quietEnd, timezone);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-3">
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <SwitchField
              label="Email notifications"
              checked={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          name="whatsapp"
          control={control}
          render={({ field }) => (
            <SwitchField
              label="WhatsApp notifications"
              checked={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </div>
      <SelectField
        label="Timezone"
        required
        options={TIMEZONE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        {...register("timezone")}
        error={errors.timezone?.message}
      />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <TextField
          label="Quiet hours start"
          placeholder="22:00"
          {...register("quietHoursStart")}
          error={errors.quietHoursStart?.message}
          hint="Optional. HH:MM in your timezone."
        />
        <TextField
          label="Quiet hours end"
          placeholder="07:00"
          {...register("quietHoursEnd")}
          error={errors.quietHoursEnd?.message}
          hint="Optional. HH:MM in your timezone."
        />
      </div>
      {quietPreview && (
        <p className="rounded-lg bg-surface-inset px-3 py-2 text-xs text-muted">{quietPreview}</p>
      )}
      <FormActions
        cancelHref={cancelHref}
        submitting={isSubmitting}
        submitLabel="Save preferences"
      />
    </form>
  );
}
