import React from "react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/portal" className="font-semibold text-gray-900 dark:text-white">
            CabFleet
          </Link>
          <nav className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <Link href="/portal/bookings">My Bookings</Link>
            <Link href="/portal/profile">Profile</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
