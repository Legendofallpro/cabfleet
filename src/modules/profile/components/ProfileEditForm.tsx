"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { FormActions } from "@/components/common/FormActions";
import { TextField } from "@/components/common/form/TextField";
import { updateProfileAction } from "@/modules/profile/actions/profile.actions";
import {
  updateProfileSchema,
  type UpdateProfileFormValues,
} from "@/modules/profile/validators/profile";

type Props = {
  defaultValues: UpdateProfileFormValues;
};

export function ProfileEditForm({ defaultValues }: Props) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues,
  });

  async function onSubmit(values: UpdateProfileFormValues) {
    const result = await updateProfileAction(values);
    if (!result.ok) {
      if (result.error.fieldErrors) {
        for (const [field, msgs] of Object.entries(result.error.fieldErrors)) {
          setError(field as keyof UpdateProfileFormValues, { message: msgs?.[0] });
        }
      }
      toast.error(result.error.message);
      return;
    }
    toast.success("Profile updated.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <TextField
        label="Full name"
        required
        {...register("fullName")}
        error={errors.fullName?.message}
      />
      <TextField
        label="Phone"
        type="tel"
        {...register("phone")}
        error={errors.phone?.message}
        hint="Optional. Used for operational contact."
      />
      <FormActions cancelHref="/" submitting={isSubmitting} submitLabel="Save profile" />
    </form>
  );
}
