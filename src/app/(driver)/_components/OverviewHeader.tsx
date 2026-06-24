import React from "react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ProfileAvatar } from "@/modules/profile/components/ProfileAvatar";
import type { DriverVerificationStatus } from "@prisma/client";

interface DriverCore {
  licenseExpiry: Date;
  status: string;
  verification: DriverVerificationStatus;
  rating: number | null;
  totalTrips: number;
  createdAt: Date;
  profile: {
    fullName: string | null;
    avatarUrl: string | null;
    branch: { name: string } | null;
  } | null;
}

interface OverviewHeaderProps {
  driver: DriverCore;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function daysUntil(date: Date): number {
  const diff = date.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function OverviewHeader({ driver }: OverviewHeaderProps) {
  const name = driver.profile?.fullName ?? "Driver";
  const branch = driver.profile?.branch?.name;
  const licDays = daysUntil(new Date(driver.licenseExpiry));
  const licenseWarning = licDays <= 60;

  const headerUser = {
    fullName: name,
    email: "",
    avatarUrl: driver.profile?.avatarUrl ?? null,
  };

  return (
    <div className="flex items-center gap-4">
      <ProfileAvatar user={headerUser} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="text-caption text-muted">{getGreeting()}</p>
        <h1 className="truncate text-xl font-bold text-default">{name}</h1>
        {branch && <p className="text-caption text-muted">{branch}</p>}
        <div className="mt-2 flex flex-wrap gap-2">
          <StatusBadge tone={driver.status === "ACTIVE" ? "success" : driver.status === "SUSPENDED" ? "error" : "warning"}>
            {driver.status.charAt(0) + driver.status.slice(1).toLowerCase().replace("_", " ")}
          </StatusBadge>
          {driver.verification === "VERIFIED" ? (
            <StatusBadge tone="success">Verified</StatusBadge>
          ) : (
            <StatusBadge tone="warning">Unverified</StatusBadge>
          )}
          {licenseWarning && (
            <StatusBadge tone={licDays <= 0 ? "error" : "warning"}>
              License {licDays <= 0 ? "expired" : `exp. ${licDays}d`}
            </StatusBadge>
          )}
        </div>
      </div>
    </div>
  );
}
