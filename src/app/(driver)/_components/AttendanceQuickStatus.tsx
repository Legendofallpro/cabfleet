"use client";

import React from "react";
import Link from "next/link";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { StatusBadge, type StatusTone } from "@/components/common/StatusBadge";
import { formatDateTime } from "@/lib/format/datetime";
import { useRequiredInstallSettings } from "@/modules/install/components/InstallSettingsProvider";

interface AttendanceRecord {
  status: string;
  checkIn: Date | null;
  checkOut: Date | null;
}

interface AttendanceQuickStatusProps {
  today: AttendanceRecord | null;
}

const LABEL: Record<string, string> = {
  PRESENT: "Present",
  HALF_DAY: "Half Day",
  ABSENT: "Absent",
  ON_LEAVE: "On Leave",
};

const TONE: Record<string, StatusTone> = {
  PRESENT: "success",
  HALF_DAY: "warning",
  ABSENT: "error",
  ON_LEAVE: "info",
};

function fmt(d: Date | null, locale: string, timeZone: string) {
  if (!d) return "—";
  return formatDateTime(d, {
    locale,
    timeZone,
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function AttendanceQuickStatus({ today }: AttendanceQuickStatusProps) {
  const settings = useRequiredInstallSettings();
  return (
    <SurfaceCard padding="md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted uppercase tracking-wide">Today&apos;s Attendance</p>
          {today ? (
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge tone={TONE[today.status] ?? "neutral"}>
                {LABEL[today.status] ?? today.status}
              </StatusBadge>
              <span className="text-xs text-muted">
                In: {fmt(today.checkIn, settings.locale, settings.timezone)} · Out: {fmt(today.checkOut, settings.locale, settings.timezone)}
              </span>
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted">Not checked in yet</p>
          )}
        </div>
        <Link href="/driver/attendance" className="text-xs font-medium text-primary hover:underline">
          View all →
        </Link>
      </div>
    </SurfaceCard>
  );
}
