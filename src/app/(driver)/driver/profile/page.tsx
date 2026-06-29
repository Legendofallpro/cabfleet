import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { format, differenceInYears, differenceInMonths } from "date-fns";

import { SurfaceCard } from "@/components/common/SurfaceCard";
import { StatusBadge, type StatusTone } from "@/components/common/StatusBadge";
import { getSessionUser } from "@/lib/auth/session";
import { getRoleHome } from "@/lib/auth/redirects";
import { getDriverCard } from "@/modules/drivers/queries/driver-self";
import type { HeaderUser } from "@/layout/header-user";
import { AvatarUploadForm } from "@/modules/profile/components/AvatarUploadForm";
import { ProfileAvatar } from "@/modules/profile/components/ProfileAvatar";
import { ProfileEditForm } from "@/modules/profile/components/ProfileEditForm";

export const metadata: Metadata = { title: "Profile | CabFleet Driver" };

const DRIVER_STATUS_TONE: Record<string, StatusTone> = {
  ACTIVE: "success",
  ON_LEAVE: "info",
  SUSPENDED: "error",
  INACTIVE: "neutral",
};

const DRIVER_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  ON_LEAVE: "On Leave",
  SUSPENDED: "Suspended",
  INACTIVE: "Inactive",
};

const VERIFY_TONE: Record<string, StatusTone> = {
  VERIFIED: "success",
  PENDING: "warning",
  REJECTED: "error",
  UNVERIFIED: "neutral",
};

const VERIFY_LABEL: Record<string, string> = {
  VERIFIED: "Verified",
  PENDING: "Pending Review",
  REJECTED: "Rejected",
  UNVERIFIED: "Unverified",
};

function daysUntil(date: Date): number {
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function tenureLabel(createdAt: Date): string {
  const years = differenceInYears(new Date(), new Date(createdAt));
  const months = differenceInMonths(new Date(), new Date(createdAt));
  if (years >= 1) return `${years}y ${months % 12}m`;
  return `${months}m`;
}

export default async function DriverProfilePage() {
  const session = await getSessionUser();
  if (!session) redirect("/signin?redirectTo=/driver/profile");
  if (session.profile.role !== "DRIVER") redirect(getRoleHome(session.profile.role));

  const driverCard = await getDriverCard(session.profile.id);

  const headerUser: HeaderUser = {
    fullName: session.profile.fullName,
    email: session.profile.email,
    avatarUrl: session.profile.avatarUrl,
  };

  const licDays = driverCard ? daysUntil(driverCard.licenseExpiry) : null;
  const licTone: StatusTone =
    licDays == null
      ? "neutral"
      : licDays <= 0
        ? "error"
        : licDays <= 30
          ? "error"
          : licDays <= 60
            ? "warning"
            : "neutral";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-default">My Profile</h2>
        <p className="text-sm text-muted">Your driver details and contact information.</p>
      </div>

      <SurfaceCard padding="sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <ProfileAvatar user={headerUser} size="lg" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-default">
                {session.profile.fullName ?? "—"}
              </p>
              <p className="truncate text-sm text-muted">{session.profile.email}</p>
              {session.profile.phone && (
                <p className="truncate text-sm text-muted">{session.profile.phone}</p>
              )}
            </div>
          </div>
          <AvatarUploadForm profileId={session.profile.id} variant="inline" />
        </div>
      </SurfaceCard>

      {driverCard ? (
        <SurfaceCard title="Driver details" padding="sm">
          <dl className="divide-y divide-default">
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-sm text-muted">Status</dt>
              <dd>
                <StatusBadge tone={DRIVER_STATUS_TONE[driverCard.status] ?? "neutral"}>
                  {DRIVER_STATUS_LABEL[driverCard.status] ?? driverCard.status}
                </StatusBadge>
              </dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-sm text-muted">Verification</dt>
              <dd>
                <StatusBadge tone={VERIFY_TONE[driverCard.verification] ?? "neutral"}>
                  {VERIFY_LABEL[driverCard.verification] ?? driverCard.verification}
                </StatusBadge>
              </dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-sm text-muted">License No.</dt>
              <dd className="text-sm font-medium text-default">{driverCard.licenseNumber}</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-sm text-muted">License expiry</dt>
              <dd className="flex items-center gap-2">
                <span className="text-sm font-medium text-default">
                  {format(new Date(driverCard.licenseExpiry), "dd MMM yyyy")}
                </span>
                {licDays != null && licDays <= 60 && (
                  <StatusBadge tone={licTone}>
                    {licDays <= 0 ? "Expired" : `${licDays}d left`}
                  </StatusBadge>
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-sm text-muted">Total trips</dt>
              <dd className="text-sm font-medium text-default">{driverCard.totalTrips}</dd>
            </div>
            {driverCard.rating != null && (
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-sm text-muted">Rating</dt>
                <dd className="text-sm font-medium text-default">
                  ★ {driverCard.rating.toFixed(1)}
                </dd>
              </div>
            )}
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-sm text-muted">Member since</dt>
              <dd className="text-sm font-medium text-default">
                {format(new Date(driverCard.createdAt), "MMM yyyy")} ·{" "}
                {tenureLabel(driverCard.createdAt)}
              </dd>
            </div>
          </dl>
        </SurfaceCard>
      ) : (
        <SurfaceCard title="Driver details" padding="sm">
          <p className="text-sm text-muted">
            Your driver record is still being set up. Contact your branch administrator if this
            persists.
          </p>
        </SurfaceCard>
      )}

      <SurfaceCard title="Contact details" padding="sm">
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
