import React from "react";
import Link from "next/link";

import { getSessionUser } from "@/lib/auth/session";
import { signOutAction } from "@/lib/auth/sign-out";

export const dynamic = "force-dynamic";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
 const session = await getSessionUser();

 return (
  <div className="min-h-screen bg-surface-inset ">
   <header className="sticky top-0 z-10 border-b border-default bg-surface-elevated/80 backdrop-blur /80">
    <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3.5">
     {/* Logo */}
     <Link
      href="/portal"
      className="flex items-center gap-2 font-bold text-default"
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
         className="hidden rounded-lg bg-primary-subtle0 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover sm:inline-flex"
        >
         Book a Ride
        </Link>
        <Link
         href="/portal/bookings"
         className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-inset dark:hover:bg-surface-elevated/[0.06]"
        >
         My Bookings
        </Link>
        <Link
         href="/portal/profile"
         className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-inset dark:hover:bg-surface-elevated/[0.06]"
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
          className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-inset dark:hover:bg-surface-elevated/[0.06]"
         >
          Sign out
         </button>
        </form>
       </>
      ) : (
       <>
        <Link
         href="/signin"
         className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-inset dark:hover:bg-surface-elevated/[0.06]"
        >
         Sign in
        </Link>
        <Link
         href="/signup"
         className="rounded-lg bg-primary-subtle0 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
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
