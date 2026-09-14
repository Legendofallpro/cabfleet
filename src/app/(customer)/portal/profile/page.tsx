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

export const metadata: Metadata = { title: "Me | CabFleet" };

export default async function ProfilePage() {
  const session = await getSessionUser();
  if (!session) redirect("/signin?redirectTo=/portal/profile");
  if (session.profile.role !== "CUSTOMER") redirect(getRoleHome(session.profile.role));

  const headerUser: HeaderUser = {
    fullName: session.profile.fullName,
    email: session.profile.email,
    avatarUrl: session.profile.avatarUrl,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-default">Me</h1>
        <p className="mt-1 text-sm text-muted">Name and mobile. Email stays with your login.</p>
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
          cancelHref="/portal"
          defaultValues={{
            fullName: session.profile.fullName ?? "",
            phone: session.profile.phone ?? "",
          }}
        />
      </SurfaceCard>

      <p className="text-center text-caption text-muted">
        Password and extra security are in{" "}
        <Link href="/portal/profile/account" className="text-primary hover:underline">
          Account settings
        </Link>
        .
      </p>
    </div>
  );
}
