import React from "react";
import Link from "next/link";

import { getSessionUser } from "@/lib/auth/session";
import { signOutAction } from "@/lib/auth/sign-out";
import { getOrCreateCustomer } from "@/modules/customers/services/customer.service";
import { CustomerBottomNav } from "@/app/(customer)/_components/CustomerBottomNav";
import { SurfaceCard } from "@/components/common/SurfaceCard";

export const dynamic = "force-dynamic";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUser();

  if (session?.profile.role === "CUSTOMER") {
    const customer = await getOrCreateCustomer(session.profile.id);
    if (customer.staffManaged) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-surface px-4">
          <SurfaceCard padding="lg" className="max-w-md">
            <h1 className="text-lg font-semibold text-default">Use staff booking</h1>
            <p className="mt-2 text-sm text-muted">
              This mobile is booked by the travel desk. Ask the operator to share
              trip details on WhatsApp, or sign up with a different email and
              mobile if you want the customer app.
            </p>
            <form action={signOutAction} className="mt-6">
              <button
                type="submit"
                className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
              >
                Sign out
              </button>
            </form>
          </SurfaceCard>
        </div>
      );
    }
  }

  const loggedIn = Boolean(session);

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-10 border-b border-default bg-surface-elevated">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <Link href={loggedIn ? "/portal" : "/signup"} className="font-bold text-default">
            CabFleet
          </Link>
          <nav className="flex items-center gap-1">
            {loggedIn ? (
              <>
                <Link
                  href="/portal/book"
                  className="hidden h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover sm:inline-flex"
                >
                  Book
                </Link>
                <Link
                  href="/portal/bookings"
                  className="hidden rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-inset sm:inline-flex"
                >
                  My trips
                </Link>
                <Link
                  href="/portal/profile"
                  className="hidden rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-inset sm:inline-flex"
                >
                  Me
                </Link>
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-inset"
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/signin"
                  className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-inset"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className={`mx-auto max-w-lg px-4 py-6 ${loggedIn ? "pb-24 sm:pb-8" : ""}`}>
        {children}
      </main>

      {loggedIn ? <CustomerBottomNav /> : null}
    </div>
  );
}
