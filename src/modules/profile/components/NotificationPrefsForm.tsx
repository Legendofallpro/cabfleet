"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { FormActions } from "@/components/common/FormActions";
import { TextField } from "@/components/common/form/TextField";
import Checkbox from "@/components/form/input/Checkbox";
import { updateNotificationPrefsAction } from "@/modules/profile/actions/profile.actions";
import {
  updateNotificationPrefsSchema,
  type UpdateNotificationPrefsFormValues,
} from "@/modules/profile/validators/profile";

type Props = {
  defaultValues: UpdateNotificationPrefsFormValues;
};

export function NotificationPrefsForm({ defaultValues }: Props) {
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-3">
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <Checkbox
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
            <Checkbox
              label="WhatsApp notifications"
              checked={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </div>
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
        <div className="md:col-span-2">
          <TextField
            label="Timezone"
            required
            {...register("timezone")}
            error={errors.timezone?.message}
            hint="IANA timezone, e.g. Asia/Kolkata"
          />
        </div>
      </div>
      <FormActions
        cancelHref="/profile/account"
        submitting={isSubmitting}
        submitLabel="Save preferences"
      />
    </form>
  );
}
