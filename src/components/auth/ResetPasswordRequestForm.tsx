"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { TextField } from "@/components/common/form/TextField";
import Button from "@/components/ui/button/Button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
 resetPasswordRequestSchema,
 type ResetPasswordRequestFormValues,
} from "@/lib/auth/validators";

export default function ResetPasswordRequestForm() {
 const router = useRouter();
 const {
  register,
  handleSubmit,
  formState: { errors, isSubmitting },
 } = useForm<ResetPasswordRequestFormValues>({
  resolver: zodResolver(resetPasswordRequestSchema),
  defaultValues: {
   email: "",
  },
 });

 async function onSubmit(values: ResetPasswordRequestFormValues) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/callback?next=/set-password&mode=recovery`,
  });

  if (error) {
   // Do not surface upstream text — it can disclose account existence.
   toast.error(
    "If an account exists for that email, a reset link has been sent.",
   );
   router.push("/signin");
   return;
  }

  toast.success("If an account exists for that email, a reset link has been sent.");
  router.push("/signin");
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
       Reset Password
      </h1>
      <p className="text-sm text-muted">
       Enter your email and we&apos;ll send you a link to reset your password.
      </p>
     </div>

     <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <TextField
       label="Email"
       type="email"
       required
       placeholder="you@cabfleet.com"
       {...register("email")}
       error={errors.email?.message}
      />

      <Button type="submit" className="w-full" size="sm" disabled={isSubmitting}>
       {isSubmitting ? "Sending reset link..." : "Send reset link"}
      </Button>
     </form>

     <div className="mt-5">
      <p className="text-sm font-normal text-center text-default dark:text-muted sm:text-start">
       Remembered your password?{" "}
       <Link
        href="/signin"
        className="text-primary hover:text-primary"
       >
        Sign in
       </Link>
      </p>
     </div>
    </div>
   </div>
  </div>
 );
}
