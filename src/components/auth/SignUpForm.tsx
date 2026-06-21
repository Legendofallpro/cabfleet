"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import Checkbox from "@/components/form/input/Checkbox";
import { TextField } from "@/components/common/form/TextField";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "@/icons";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { signUpSchema, type SignUpValues } from "@/lib/auth/validators";

export default function SignUpForm() {
 const router = useRouter();
 const [showPassword, setShowPassword] = useState(false);

 const {
  register,
  handleSubmit,
  control,
  formState: { errors, isSubmitting },
 } = useForm<SignUpValues>({
  resolver: zodResolver(signUpSchema),
  defaultValues: {
   firstName: "",
   lastName: "",
   email: "",
   password: "",
   agreed: false as unknown as true,
  },
 });

 async function onSubmit(values: SignUpValues) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signUp({
   email: values.email,
   password: values.password,
   options: {
    data: {
     full_name: `${values.firstName} ${values.lastName}`.trim(),
    },
   },
  });
  if (error) {
   const hint =
    error.message?.toLowerCase().includes("database") ||
    error.message?.toLowerCase().includes("saving new user")
     ? " Account setup failed — your Supabase project is missing the org-aware profile trigger. Apply prisma/sql/06_profile_sync_org.sql in the Supabase SQL editor."
     : "";
   toast.error(`Unable to create your account.${hint}`);
   return;
  }
  // When email confirmation is disabled in Supabase the signUp call returns
  // a live session immediately. Navigate straight to the portal in that case.
  // When confirmation IS required the session is null and the user needs to
  // check their inbox first.
  if (data.session) {
   toast.success("Account created. Taking you to the portal…");
   router.push("/portal");
   router.refresh();
  } else {
   toast.success("Account created. Check your email to confirm, then sign in.");
   router.push("/signin");
  }
 }

 return (
  <div className="flex flex-col flex-1 lg:w-1/2 w-full overflow-y-auto no-scrollbar">
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
       Sign Up
      </h1>
      <p className="text-sm text-muted">
       Create a customer account to book rides.
      </p>
     </div>
     <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
       <TextField
        label="First name"
        required
        placeholder="Enter your first name"
        autoComplete="given-name"
        {...register("firstName")}
        error={errors.firstName?.message}
       />
       <TextField
        label="Last name"
        required
        placeholder="Enter your last name"
        autoComplete="family-name"
        {...register("lastName")}
        error={errors.lastName?.message}
       />
      </div>
      <TextField
       label="Email"
       type="email"
       required
       placeholder="Enter your email"
       autoComplete="email"
       {...register("email")}
       error={errors.email?.message}
      />
      <div className="relative">
       <TextField
        label="Password"
        type={showPassword ? "text" : "password"}
        required
        placeholder="At least 8 characters"
        autoComplete="new-password"
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
      <div className="flex items-center gap-3">
       <Controller
        control={control}
        name="agreed"
        render={({ field }) => (
         <Checkbox
          className="w-5 h-5"
          checked={Boolean(field.value)}
          onChange={(v) => field.onChange(v)}
         />
        )}
       />
       <p className="inline-block font-normal text-muted">
        By creating an account you agree to the{" "}
        <span className="text-default">
         Terms and Conditions
        </span>{" "}
        and{" "}
        <span className="text-default ">Privacy Policy</span>.
       </p>
      </div>
      {errors.agreed && (
       <p className="text-xs text-error-500">{errors.agreed.message}</p>
      )}
      <button
       type="submit"
       disabled={isSubmitting}
       className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-primary shadow-theme-xs hover:bg-primary-hover disabled:opacity-50"
      >
       {isSubmitting ? "Creating account..." : "Sign Up"}
      </button>
     </form>

     <div className="mt-5">
      <p className="text-sm font-normal text-center text-default dark:text-muted sm:text-start">
       Already have an account?{" "}
       <Link
        href="/signin"
        className="text-primary hover:text-primary"
       >
        Sign In
       </Link>
      </p>
     </div>
    </div>
   </div>
  </div>
 );
}
