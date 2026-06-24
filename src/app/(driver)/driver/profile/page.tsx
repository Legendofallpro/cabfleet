import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SurfaceCard } from "@/components/common/SurfaceCard";
import { getSessionUser } from "@/lib/auth/session";
import { getRoleHome } from "@/lib/auth/redirects";
import type { HeaderUser } from "@/layout/header-user";
import { AvatarUploadForm } from "@/modules/profile/components/AvatarUploadForm";
import { ProfileAvatar } from "@/modules/profile/components/ProfileAvatar";
import { ProfileEditForm } from "@/modules/profile/components/ProfileEditForm";

export const metadata: Metadata = { title: "Profile | CabFleet Driver" };

export default async function DriverProfilePage() {
  const session = await getSessionUser();
  if (!session) redirect("/signin?redirectTo=/driver/profile");
  if (session.profile.role !== "DRIVER") redirect(getRoleHome(session.profile.role));

  const headerUser: HeaderUser = {
    fullName: session.profile.fullName,
    email: session.profile.email,
    avatarUrl: session.profile.avatarUrl,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-default">My profile</h2>
        <p className="text-sm text-muted">Update your contact details and avatar.</p>
      </div>

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
          cancelHref="/driver"
          defaultValues={{
            fullName: session.profile.fullName ?? "",
            phone: session.profile.phone ?? "",
          }}
        />
      </SurfaceCard>

      <p className="text-center text-caption text-muted">
        Password and notifications are in{" "}
        <Link href="/driver/profile/account" className="text-primary hover:underline">
          Account settings
        </Link>
        .
      </p>
    </div>
  );
}
