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
import { getPostAuthRedirectAction } from "@/lib/auth/post-auth-redirect.action";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { signInSchema, type SignInValues } from "@/lib/auth/validators";
import { recordMfaAuditAction } from "@/modules/profile/actions/profile.actions";

export default function SignInForm() {
  const searchParams = useSearchParams();
  const requestedRedirect = searchParams.get("redirectTo");

  const [showPassword, setShowPassword] = useState(false);
  const [mfaChallenge, setMfaChallenge] = useState<{
    factorId: string;
    challengeId: string;
  } | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaSubmitting, setMfaSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  async function completeSignIn() {
    const dest = await getPostAuthRedirectAction(requestedRedirect);
    window.location.assign(dest);
  }

  async function onSubmit(values: SignInValues) {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    if (error) {
      toast.error(error.message ?? "Invalid email or password.");
      return;
    }

    const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError) {
      toast.error(aalError.message);
      return;
    }

    if (aal.currentLevel === "aal1" && aal.nextLevel === "aal2") {
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) {
        toast.error(factorsError.message);
        return;
      }
      const totp = factors.totp.find((f) => f.status === "verified");
      if (!totp) {
        toast.error("Two-factor authentication is required but no factor is enrolled.");
        return;
      }
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totp.id,
      });
      if (challengeError) {
        toast.error(challengeError.message);
        return;
      }
      setMfaChallenge({ factorId: totp.id, challengeId: challenge.id });
      return;
    }

    await completeSignIn();
  }

  async function onMfaSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mfaChallenge) return;
    setMfaSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.mfa.verify({
        factorId: mfaChallenge.factorId,
        challengeId: mfaChallenge.challengeId,
        code: mfaCode.trim(),
      });
      if (error) {
        toast.error(error.message ?? "Invalid verification code.");
        return;
      }
      await recordMfaAuditAction({ event: "MFA_VERIFY", factorId: mfaChallenge.factorId });
      await completeSignIn();
    } finally {
      setMfaSubmitting(false);
    }
  }

  if (mfaChallenge) {
    return (
      <div className="flex flex-col flex-1 lg:w-1/2 w-full">
        <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-default text-title-sm sm:text-title-md">
              Two-factor authentication
            </h1>
            <p className="text-sm text-muted">
              Enter the 6-digit code from your authenticator app for{" "}
              <span className="font-medium text-default">{getValues("email")}</span>.
            </p>
          </div>
          <form onSubmit={onMfaSubmit} className="space-y-6" noValidate>
            <TextField
              label="Verification code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              placeholder="000000"
            />
            <Button type="submit" className="w-full" size="sm" disabled={mfaSubmitting}>
              {mfaSubmitting ? "Verifying…" : "Verify and sign in"}
            </Button>
            <button
              type="button"
              className="w-full text-sm text-muted hover:text-default"
              onClick={() => {
                setMfaChallenge(null);
                setMfaCode("");
              }}
            >
              Back to sign in
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      <div className="w-full max-w-md sm:pt-10 mx-auto mb-5">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-muted transition-colors hover:text-default"
        >
          <ChevronLeftIcon />
          Back to home
        </Link>
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-default text-title-sm sm:text-title-md">
              Sign In
            </h1>
            <p className="text-sm text-muted">Enter your email and password to sign in.</p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
            <TextField
              label="Email"
              type="email"
              required
              placeholder="you@example.com"
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
                {showPassword ? <EyeIcon /> : <EyeCloseIcon />}
              </button>
            </div>
            <div className="flex items-center justify-end">
              <Link href="/reset-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <Button type="submit" className="w-full" size="sm" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="mt-5">
            <p className="text-sm font-normal text-center text-default sm:text-start">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-primary hover:underline">
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
