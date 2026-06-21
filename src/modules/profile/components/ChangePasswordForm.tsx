"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { FormActions } from "@/components/common/FormActions";
import { TextField } from "@/components/common/form/TextField";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { setPasswordSchema, type SetPasswordFormValues } from "@/lib/auth/validators";

export function ChangePasswordForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SetPasswordFormValues>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit(values: SetPasswordFormValues) {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password: values.password });

    if (error) {
      toast.error(error.message ?? "Could not update your password. Please try again.");
      return;
    }

    toast.success("Password updated.");
    reset();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <TextField
        label="New password"
        type="password"
        required
        autoComplete="new-password"
        placeholder="At least 8 characters"
        {...register("password")}
        error={errors.password?.message}
      />
      <TextField
        label="Confirm password"
        type="password"
        required
        autoComplete="new-password"
        placeholder="Repeat your new password"
        {...register("confirmPassword")}
        error={errors.confirmPassword?.message}
      />
      <FormActions cancelHref="/profile/account" submitting={isSubmitting} submitLabel="Update password" />
    </form>
  );
}
