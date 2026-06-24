"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { FormActions } from "@/components/common/FormActions";
import { TextField } from "@/components/common/form/TextField";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from "@/modules/profile/validators/profile";

type Props = {
  email: string;
  cancelHref?: string;
};

export function ChangePasswordForm({ email, cancelHref = "/profile/account" }: Props) {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", password: "", confirmPassword: "" },
  });

  async function onSubmit(values: ChangePasswordFormValues) {
    const supabase = getSupabaseBrowserClient();

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email,
      password: values.currentPassword,
    });
    if (verifyError) {
      toast.error("Current password is incorrect.");
      return;
    }

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
        label="Current password"
        type={showCurrent ? "text" : "password"}
        required
        autoComplete="current-password"
        {...register("currentPassword")}
        error={errors.currentPassword?.message}
      />
      <button
        type="button"
        className="text-xs text-primary hover:underline"
        onClick={() => setShowCurrent((v) => !v)}
      >
        {showCurrent ? "Hide" : "Show"} current password
      </button>
      <TextField
        label="New password"
        type={showNew ? "text" : "password"}
        required
        autoComplete="new-password"
        placeholder="At least 8 characters"
        {...register("password")}
        error={errors.password?.message}
      />
      <button
        type="button"
        className="text-xs text-primary hover:underline"
        onClick={() => setShowNew((v) => !v)}
      >
        {showNew ? "Hide" : "Show"} new password
      </button>
      <TextField
        label="Confirm password"
        type="password"
        required
        autoComplete="new-password"
        placeholder="Repeat your new password"
        {...register("confirmPassword")}
        error={errors.confirmPassword?.message}
      />
      <FormActions cancelHref={cancelHref} submitting={isSubmitting} submitLabel="Update password" />
    </form>
  );
}
