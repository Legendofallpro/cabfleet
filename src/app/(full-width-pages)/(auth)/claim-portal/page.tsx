import { Metadata } from "next";
import Link from "next/link";

import { ClaimPortalForm } from "@/components/auth/ClaimPortalForm";
import { verifyPortalClaimToken } from "@/lib/auth/portal-claim-proof";

export const metadata: Metadata = {
  title: "Claim portal | CabFleet",
  description: "Open a CabFleet customer account from a desk invite.",
};

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ClaimPortalPage({ searchParams }: Props) {
  const { token } = await searchParams;
  const verified = token ? verifyPortalClaimToken(token) : null;

  if (!verified || !token) {
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
          <div className="rounded-2xl border border-default bg-surface-elevated p-6">
            <h1 className="text-xl font-semibold text-default">
              Link invalid or expired
            </h1>
            <p className="mt-2 text-sm text-muted">
              Ask the desk to send a new portal invite.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <ClaimPortalForm token={token} />;
}
