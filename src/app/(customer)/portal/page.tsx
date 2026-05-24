import React from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";

export default async function CustomerPortalPage() {
  const session = await getSessionUser();
  if (!session) redirect("/signin?redirectTo=/portal");

  return (
    <div className="rounded-2xl border border-gray-200 p-8 dark:border-gray-800">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
        Welcome back, {session.profile.fullName ?? session.profile.email}
      </h2>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Booking, history, and invoices land in Phase 3.
      </p>
    </div>
  );
}
