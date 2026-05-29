"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { TextField } from "@/components/common/form/TextField";
import Button from "@/components/ui/button/Button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { clearPasswordSetupProof } from "@/lib/auth/password-completion";
import { sanitizeRedirectTo } from "@/lib/auth/redirects";
import {
 setPasswordSchema,
 type SetPasswordFormValues,
} from "@/lib/auth/validators";

type Props = {
 mode: "invite" | "recovery";
 /** Sanitized post-password redirect target from the callback proof. */
 postPasswordRedirect: string;
};

const COPY = {
 invite: {
  title: "Create Password",
  description: "Set your password to finish accepting the CabFleet invite.",
  success: "Password created. Redirecting…",
  submitLabel: "Create password",
 },
 recovery: {
  title: "Choose New Password",
  description: "Enter a new password for your CabFleet account.",
  success: "Password updated. Redirecting…",
  submitLabel: "Update password",
 },
} as const;

export function SetPasswordForm({ mode, postPasswordRedirect }: Props) {
 const router = useRouter();
 const copy = COPY[mode];
 const {
  register,
  handleSubmit,
  formState: { errors, isSubmitting },
 } = useForm<SetPasswordFormValues>({
  resolver: zodResolver(setPasswordSchema),
  defaultValues: {
   password: "",
   confirmPassword: "",
  },
 });

 async function onSubmit(values: SetPasswordFormValues) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.updateUser({ password: values.password });

  if (error) {
   toast.error("Could not update your password. Please try again.");
   return;
  }

  // Clear the HttpOnly proof cookie via a Server Action — client JS cannot
  // reach it directly.
  await clearPasswordSetupProof();

  toast.success(copy.success);
  // Re-sanitize the redirect at submit time. The cookie value was validated
  // server-side when issued, but defense-in-depth here is cheap.
  const safeRedirect = sanitizeRedirectTo(postPasswordRedirect) ?? "/";
  router.push(safeRedirect);
  router.refresh();
 }

 return (
  <div className="flex flex-col flex-1 lg:w-1/2 w-full">
   <div className="w-full max-w-md sm:pt-10 mx-auto mb-5">
    <Link
     href="/signin"
     className="inline-flex items-center text-sm text-muted transition-colors hover:text-default dark:text-muted dark:hover:text-gray-300"
    >
     Back to sign in
    </Link>
   </div>
   <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
    <div>
     <div className="mb-5 sm:mb-8">
      <h1 className="mb-2 font-semibold text-default text-title-sm /90 sm:text-title-md">
       {copy.title}
      </h1>
      <p className="text-sm text-muted">
       {copy.description}
      </p>
     </div>

     <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <TextField
       label="New password"
       type="password"
       required
       placeholder="At least 8 characters"
       {...register("password")}
       error={errors.password?.message}
      />
      <TextField
       label="Confirm password"
       type="password"
       required
       placeholder="Repeat your new password"
       {...register("confirmPassword")}
       error={errors.confirmPassword?.message}
      />

      <Button className="w-full" size="sm" disabled={isSubmitting}>
       {isSubmitting ? "Saving password..." : copy.submitLabel}
      </Button>
     </form>
    </div>
   </div>
  </div>
 );
}
