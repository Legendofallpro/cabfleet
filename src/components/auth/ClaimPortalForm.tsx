"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { TextField } from "@/components/common/form/TextField";
import { claimStaffManagedCustomerAction } from "@/modules/customers/actions/signup.actions";
import {
  claimStaffManagedCustomerSchema,
  type ClaimStaffManagedCustomerInput,
} from "@/modules/customers/validators/customer";

type Props = { token: string };

export function ClaimPortalForm({ token }: Props) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClaimStaffManagedCustomerInput>({
    resolver: zodResolver(claimStaffManagedCustomerSchema),
    defaultValues: { token, email: "", password: "", fullName: "" },
  });

  async function onSubmit(values: ClaimStaffManagedCustomerInput) {
    const result = await claimStaffManagedCustomerAction(values);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Check your email to confirm the address, then sign in.");
    router.push("/signin");
  }

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      <div className="w-full max-w-md sm:pt-10 mx-auto mb-5">
        <Link
          href="/signin"
          className="inline-flex items-center text-sm text-muted transition-colors hover:text-default"
        >
          Back to sign in
        </Link>
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <h1 className="mb-2 font-semibold text-default text-title-sm sm:text-title-md">
          Open your CabFleet account
        </h1>
        <p className="mb-6 text-sm text-muted">
          Set the email and password you will use to see your trips.
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <input type="hidden" {...register("token")} />
          <TextField
            label="Full name"
            required
            autoComplete="name"
            {...register("fullName")}
            error={errors.fullName?.message}
          />
          <TextField
            label="Email"
            type="email"
            required
            autoComplete="email"
            {...register("email")}
            error={errors.email?.message}
          />
          <TextField
            label="Password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            {...register("password")}
            error={errors.password?.message}
          />
          <button
            type="button"
            className="text-sm text-primary"
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? "Hide password" : "Show password"}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-primary hover:bg-primary-hover disabled:opacity-50"
          >
            {isSubmitting ? "Saving…" : "Create portal login"}
          </button>
        </form>
      </div>
    </div>
  );
}
