import React from "react";
import Link from "next/link";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { StatusBadge, type StatusTone } from "@/components/common/StatusBadge";

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

function fmt(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function AttendanceQuickStatus({ today }: AttendanceQuickStatusProps) {
  return (
    <SurfaceCard padding="sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-caption text-muted uppercase tracking-wide">Today&apos;s Attendance</p>
          {today ? (
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge tone={TONE[today.status] ?? "neutral"}>
                {LABEL[today.status] ?? today.status}
              </StatusBadge>
              <span className="text-xs text-muted">
                In: {fmt(today.checkIn)} · Out: {fmt(today.checkOut)}
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
