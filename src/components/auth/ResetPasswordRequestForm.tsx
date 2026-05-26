"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { TextField } from "@/components/common/form/TextField";
import Button from "@/components/ui/button/Button";
import { env } from "@/lib/env";
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
      redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/set-password&mode=recovery`,
    });

    if (error) {
      toast.error(error.message);
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
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          Back to sign in
        </Link>
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Reset Password
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
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

            <Button className="w-full" size="sm" disabled={isSubmitting}>
              {isSubmitting ? "Sending reset link..." : "Send reset link"}
            </Button>
          </form>

          <div className="mt-5">
            <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
              Remembered your password?{" "}
              <Link
                href="/signin"
                className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
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
