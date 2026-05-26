import { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";

import { SetPasswordForm } from "@/components/auth/SetPasswordForm";
import { getSetPasswordMode } from "@/lib/auth/callback";
import { getRawAuthUser } from "@/lib/auth/session";
import { verifyProof, PROOF_COOKIE_NAME } from "@/lib/auth/password-setup-proof";

export const metadata: Metadata = {
  title: "Set Password | CabFleet",
  description: "Create or reset your CabFleet password.",
};

type Props = {
  searchParams: Promise<{
    mode?: string;
  }>;
};

function InvalidLinkState() {
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
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Link Invalid Or Expired
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Request a new password reset link or sign in if your password has already been updated.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/reset-password"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600"
            >
              Request new link
            </Link>
            <Link
              href="/signin"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function SetPasswordPage({ searchParams }: Props) {
  const { mode } = await searchParams;
  const passwordMode = getSetPasswordMode(mode);

  if (!passwordMode) {
    return <InvalidLinkState />;
  }

  // Require a valid server-issued proof cookie to prevent direct navigation
  // to this page. The proof is only issued by /auth/callback after a
  // successful invite/recovery OTP verification.
  const cookieStore = await cookies();
  const proofValue = cookieStore.get(PROOF_COOKIE_NAME)?.value;
  const proof = proofValue ? verifyProof(proofValue) : null;

  if (!proof) {
    return <InvalidLinkState />;
  }

  // Also verify a live Supabase session exists (belt-and-suspenders).
  const rawUser = await getRawAuthUser();
  if (!rawUser || rawUser.id !== proof.authUserId) {
    return <InvalidLinkState />;
  }

  // Proof flow must match the URL mode to prevent cross-flow confusion.
  if (proof.flow !== passwordMode) {
    return <InvalidLinkState />;
  }

  return <SetPasswordForm mode={passwordMode} postPasswordRedirect={proof.redirectTo} />;
}
