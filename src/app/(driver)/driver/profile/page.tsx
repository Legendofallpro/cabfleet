import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Profile | CabFleet Driver" };

export default async function DriverProfilePage() {
  const session = await getSessionUser();
  if (!session) redirect("/signin");

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">My Profile</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {session.profile.fullName ?? session.profile.email}
      </p>
      <p className="mt-0.5 text-xs text-gray-400">{session.profile.email}</p>
      {session.profile.phone && (
        <p className="mt-0.5 text-xs text-gray-400">{session.profile.phone}</p>
      )}
    </div>
  );
}
