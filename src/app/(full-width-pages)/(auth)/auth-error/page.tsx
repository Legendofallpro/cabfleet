import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Auth Error | CabFleet",
  description: "An authentication error occurred.",
};

type Props = {
  searchParams: Promise<{
    reason?: string;
  }>;
};

const COPY: Record<string, { heading: string; body: string }> = {
  provisioning: {
    heading: "Account Setup Incomplete",
    body: "Your login was verified but your account profile has not been set up yet. This can happen if the invite was accepted before the system finished provisioning your account. Please contact your administrator.",
  },
  default: {
    heading: "Authentication Error",
    body: "An unexpected error occurred during sign-in. Please try again or contact your administrator if the problem persists.",
  },
};

export default async function AuthErrorPage({ searchParams }: Props) {
  const { reason } = await searchParams;
  const copy = (reason != null ? COPY[reason] : undefined) ?? COPY.default;

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
            {copy.heading}
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{copy.body}</p>
          <div className="mt-6">
            <Link
              href="/signin"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600"
            >
              Go to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
