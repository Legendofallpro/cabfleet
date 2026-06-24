import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SurfaceCard } from "@/components/common/SurfaceCard";
import { getSessionUser } from "@/lib/auth/session";
import { getRoleHome } from "@/lib/auth/redirects";
import type { HeaderUser } from "@/layout/header-user";
import { getOrCreateCustomer } from "@/modules/customers/services/customer.service";
import { AvatarUploadForm } from "@/modules/profile/components/AvatarUploadForm";
import { ProfileAvatar } from "@/modules/profile/components/ProfileAvatar";
import { ProfileEditForm } from "@/modules/profile/components/ProfileEditForm";

export const metadata: Metadata = { title: "Profile | CabFleet" };

const dtFmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "long" });

function ProfileRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-3.5 sm:flex-row sm:items-center sm:gap-6">
      <dt className="w-36 shrink-0 text-xs font-medium text-muted">{label}</dt>
      <dd className="text-sm text-default">{value ?? "—"}</dd>
    </div>
  );
}

export default async function ProfilePage() {
  const session = await getSessionUser();
  if (!session) redirect("/signin?redirectTo=/portal/profile");

  if (session.profile.role !== "CUSTOMER") redirect(getRoleHome(session.profile.role));

  const customer = await getOrCreateCustomer(session.profile.id);
  const headerUser: HeaderUser = {
    fullName: session.profile.fullName,
    email: session.profile.email,
    avatarUrl: session.profile.avatarUrl,
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-default">Profile</h1>
        <p className="mt-1 text-sm text-muted">Update your name, phone, and avatar.</p>
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

      <SurfaceCard title="Loyalty">
        <dl className="divide-y divide-default">
          <ProfileRow label="Loyalty tier" value={customer.loyaltyTier ?? "Standard"} />
          <ProfileRow label="Total bookings" value={customer.totalBookings} />
          <ProfileRow label="Member since" value={dtFmt.format(new Date(customer.createdAt))} />
        </dl>
      </SurfaceCard>

      <p className="text-center text-caption text-muted">
        Password and notifications are in{" "}
        <Link href="/portal/profile/account" className="text-primary hover:underline">
          Account settings
        </Link>
        .
      </p>
    </div>
  );
}
