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
     className="inline-flex items-center text-sm text-muted transition-colors hover:text-default "
    >
     Back to sign in
    </Link>
   </div>
   <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
    <div className="rounded-2xl border border-default bg-surface-elevated p-6 ">
     <h1 className="text-xl font-semibold text-default">
      {copy.heading}
     </h1>
     <p className="mt-2 text-sm text-muted">{copy.body}</p>
     <div className="mt-6">
      <Link
       href="/signin"
       className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover"
      >
       Go to sign in
      </Link>
     </div>
    </div>
   </div>
  </div>
 );
}
