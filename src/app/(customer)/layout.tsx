import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function signOutAction() {
  "use server";
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/signin");
}

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUser();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-950/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3.5">
          {/* Logo */}
          <Link
            href="/portal"
            className="flex items-center gap-2 font-bold text-gray-900 dark:text-white"
          >
            <span className="text-xl">🚕</span>
            <span>CabFleet</span>
          </Link>

          {/* Nav */}
          <nav className="flex items-center gap-1 sm:gap-2">
            {session ? (
              <>
                <Link
                  href="/portal/book"
                  className="hidden rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 sm:inline-flex"
                >
                  Book a Ride
                </Link>
                <Link
                  href="/portal/bookings"
                  className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.06]"
                >
                  My Bookings
                </Link>
                <Link
                  href="/portal/profile"
                  className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.06]"
                >
                  {/* Show first name on larger screens, icon fallback */}
                  <span className="hidden sm:inline">
                    {session.profile.fullName?.split(" ")[0] ?? "Profile"}
                  </span>
                  <span className="sm:hidden">👤</span>
                </Link>
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.06]"
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/signin"
                  className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.06]"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
