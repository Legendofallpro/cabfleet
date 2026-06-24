import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { getSessionUser } from "@/lib/auth/session";
import type { HeaderUser } from "@/layout/header-user";
import { ProfileAvatar } from "@/modules/profile/components/ProfileAvatar";
import { ProfileContextCard } from "@/modules/profile/components/ProfileContextCard";
import { ProfileEditForm } from "@/modules/profile/components/ProfileEditForm";
import { AvatarUploadForm } from "@/modules/profile/components/AvatarUploadForm";
import { getProfileWithContext } from "@/modules/profile/queries/profile.queries";

export const metadata: Metadata = {
  title: "Profile | CabFleet Admin",
  description: "Edit your personal profile",
};

export default async function AdminProfilePage() {
  const session = await getSessionUser();
  if (!session) redirect("/signin?redirectTo=/profile");

  const context = await getProfileWithContext(session.profile.id);
  const headerUser: HeaderUser = {
    fullName: session.profile.fullName,
    email: session.profile.email,
    avatarUrl: session.profile.avatarUrl,
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageBreadcrumb pageTitle="Edit profile" />
      <p className="text-sm text-muted">Update your name, contact phone, and avatar.</p>

      <SurfaceCard>
        <div className="mb-6 flex items-center gap-4">
          <ProfileAvatar user={headerUser} size="md" />
          <div>
            <p className="font-semibold text-default">{session.profile.fullName ?? "—"}</p>
            <p className="text-sm text-muted">{session.profile.email}</p>
          </div>
        </div>

        <AvatarUploadForm profileId={session.profile.id} />

        <ProfileEditForm
          email={session.profile.email}
          defaultValues={{
            fullName: session.profile.fullName ?? "",
            phone: session.profile.phone ?? "",
          }}
        />
      </SurfaceCard>

      {context && <ProfileContextCard context={context} />}

      <p className="text-center text-caption text-muted">
        Password and notifications are in{" "}
        <Link href="/profile/account" className="text-primary hover:underline">
          Account settings
        </Link>
        .
      </p>
    </div>
  );
}
