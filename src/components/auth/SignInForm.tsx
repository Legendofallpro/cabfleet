"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { TextField } from "@/components/common/form/TextField";
import Button from "@/components/ui/button/Button";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "@/icons";
import { sanitizeRedirectTo } from "@/lib/auth/redirects";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { signInSchema, type SignInValues } from "@/lib/auth/validators";

export default function SignInForm() {
 const searchParams = useSearchParams();
 const redirectTo = sanitizeRedirectTo(searchParams.get("redirectTo")) ?? "/";

 const [showPassword, setShowPassword] = useState(false);

 const {
  register,
  handleSubmit,
  formState: { errors, isSubmitting },
 } = useForm<SignInValues>({
  resolver: zodResolver(signInSchema),
  defaultValues: { email: "", password: "" },
 });

 async function onSubmit(values: SignInValues) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.signInWithPassword({
   email: values.email,
   password: values.password,
  });
  if (error) {
   // Supabase returns the same error shape for "wrong password" and
   // "email not confirmed" to avoid account enumeration. The message
   // is safe to surface verbatim here because it doesn't leak existence.
   toast.error(error.message ?? "Invalid email or password.");
   return;
  }
  // Hard redirect so Next.js re-runs the middleware with the fresh
  // Supabase auth cookies. router.push() alone is a client-side
  // navigation that can miss the cookie hand-off in some Next.js
  // versions; window.location guarantees a full request cycle.
  window.location.href = redirectTo;
 }

 return (
  <div className="flex flex-col flex-1 lg:w-1/2 w-full">
   <div className="w-full max-w-md sm:pt-10 mx-auto mb-5">
    <Link
     href="/"
     className="inline-flex items-center text-sm text-muted transition-colors hover:text-default dark:text-muted dark:hover:text-gray-300"
    >
     <ChevronLeftIcon />
     Back to dashboard
    </Link>
   </div>
   <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
    <div>
     <div className="mb-5 sm:mb-8">
      <h1 className="mb-2 font-semibold text-default text-title-sm /90 sm:text-title-md">
       Sign In
      </h1>
      <p className="text-sm text-muted">
       Enter your email and password to sign in.
      </p>
     </div>
     <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <TextField
       label="Email"
       type="email"
       required
       placeholder="you@cabfleet.com"
       autoComplete="email"
       {...register("email")}
       error={errors.email?.message}
      />
      <div className="relative">
       <TextField
        label="Password"
        type={showPassword ? "text" : "password"}
        required
        placeholder="Enter your password"
        autoComplete="current-password"
        {...register("password")}
        error={errors.password?.message}
       />
       <button
        type="button"
        onClick={() => setShowPassword((v) => !v)}
        className="absolute z-30 top-9 right-4 cursor-pointer"
        aria-label={showPassword ? "Hide password" : "Show password"}
       >
        {showPassword ? (
         <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
        ) : (
         <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
        )}
       </button>
      </div>
      <div className="flex items-center justify-end">
       <Link
        href="/reset-password"
        className="text-sm text-primary hover:text-primary"
       >
        Forgot password?
       </Link>
      </div>
      <Button type="submit" className="w-full" size="sm" disabled={isSubmitting}>
       {isSubmitting ? "Signing in..." : "Sign in"}
      </Button>
     </form>

     <div className="mt-5">
      <p className="text-sm font-normal text-center text-default dark:text-muted sm:text-start">
       Don&apos;t have an account?{" "}
       <Link
        href="/signup"
        className="text-primary hover:text-primary"
       >
        Sign Up
       </Link>
      </p>
     </div>
    </div>
   </div>
  </div>
 );
}
