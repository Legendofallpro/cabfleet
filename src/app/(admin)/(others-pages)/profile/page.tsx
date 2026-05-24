import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "My Profile | CabFleet Admin" };

export default async function ProfilePage() {
  const session = await getSessionUser();
  if (!session) redirect("/signin?redirectTo=/profile");

  return (
    <div>
      <PageBreadcrumb pageTitle="My Profile" />
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-gray-500">Name</dt>
            <dd className="mt-1 text-sm text-gray-800 dark:text-white/90">
              {session.profile.fullName ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-gray-500">Email</dt>
            <dd className="mt-1 text-sm text-gray-800 dark:text-white/90">{session.email}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-gray-500">Phone</dt>
            <dd className="mt-1 text-sm text-gray-800 dark:text-white/90">
              {session.profile.phone ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-gray-500">Role</dt>
            <dd className="mt-1 text-sm text-gray-800 dark:text-white/90">
              {session.profile.role}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
