import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { getSessionUser } from "@/lib/auth/session";
import { getHeaderInitials } from "@/layout/header-user";
import { ProfileEditForm } from "@/modules/profile/components/ProfileEditForm";

export const metadata: Metadata = {
  title: "Profile | CabFleet Admin",
  description: "Edit your personal profile",
};

export default async function AdminProfilePage() {
  const session = await getSessionUser();
  if (!session) redirect("/signin?redirectTo=/profile");

  const headerUser = {
    fullName: session.profile.fullName,
    email: session.profile.email,
    avatarUrl: session.profile.avatarUrl,
  };

  return (
    <div className="mx-auto max-w-lg">
      <PageBreadcrumb pageTitle="Edit profile" />
      <p className="mb-6 text-sm text-muted">Update your name and contact phone.</p>

      <SurfaceCard>
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-subtle text-xl font-bold text-primary">
            {getHeaderInitials(headerUser)}
          </div>
          <div>
            <p className="font-semibold text-default">{session.profile.fullName ?? "—"}</p>
            <p className="text-sm text-muted">{session.profile.email}</p>
          </div>
        </div>

        <ProfileEditForm
          defaultValues={{
            fullName: session.profile.fullName ?? "",
            phone: session.profile.phone ?? "",
          }}
        />
      </SurfaceCard>

      <p className="mt-4 text-center text-caption text-muted">
        Password and notifications are in{" "}
        <Link href="/profile/account" className="text-primary hover:underline">
          Account settings
        </Link>
        .
      </p>
    </div>
  );
}
