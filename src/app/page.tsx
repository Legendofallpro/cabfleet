import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { getRoleHome } from "@/lib/auth/redirects";
import { isInstallGateEnabled } from "@/lib/env";
import { getInstallSettings } from "@/modules/install/queries/install";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CabFleet",
  description: "Book a ride, dispatch a cab, or drive a trip.",
};

export default async function LandingPage() {
  if (isInstallGateEnabled()) {
    const settings = await getInstallSettings();
    if (!settings?.setupCompletedAt) {
      redirect("/setup");
    }
  }

  const session = await getSessionUser();
  if (session) redirect(getRoleHome(session.profile.role));

  return (
    <main className="flex min-h-screen flex-col bg-surface px-4 py-12">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <p className="text-sm font-medium text-primary">CabFleet</p>
        <h1 className="mt-2 text-3xl font-semibold text-default">
          Book a ride. Dispatch a cab. Drive a trip.
        </h1>
        <p className="mt-3 text-sm text-muted">
          Phone-first travel desk and self-serve trips for staff, passengers, and
          drivers.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/signup"
            className="flex h-12 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            Book a ride
          </Link>
          <Link
            href="/signin?redirectTo=/dashboard"
            className="flex h-12 items-center justify-center rounded-xl border border-default bg-surface-elevated text-sm font-semibold text-default hover:bg-surface-inset"
          >
            Staff sign in
          </Link>
          <Link
            href="/signin?redirectTo=/driver"
            className="flex h-12 items-center justify-center rounded-xl border border-default bg-surface-elevated text-sm font-semibold text-default hover:bg-surface-inset"
          >
            Driver sign in
          </Link>
        </div>
        <p className="mt-6 text-sm text-muted">
          Already a passenger?{" "}
          <Link
            href="/signin?redirectTo=/portal"
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
