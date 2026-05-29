"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { checkInAction, checkOutAction } from "@/modules/attendance/actions/attendance.actions";
import { StatusBadge, type StatusTone } from "@/components/common/StatusBadge";
import type { AttendanceRow } from "@/modules/attendance/queries/attendance";

const ATTENDANCE_TONE: Record<string, StatusTone> = {
 PRESENT: "success",
 HALF_DAY: "warning",
 ABSENT: "error",
 ON_LEAVE: "info",
};

interface Props {
 profileId: string;
 today: string;
 record: AttendanceRow | null;
}

export function AttendanceSelfCard({ profileId, today, record }: Props) {
 const [isPending, startTransition] = useTransition();
 const [current, setCurrent] = useState(record);

 const handleCheckIn = () => {
  startTransition(async () => {
   const now = new Date();
   const result = await checkInAction({
    profileId,
    date: today,
    checkIn: now.toISOString(),
   });
   if (!result.ok) {
    toast.error(result.error.message);
    return;
   }
   toast.success("Checked in successfully.");
   setCurrent(result.data as unknown as AttendanceRow);
  });
 };

 const handleCheckOut = () => {
  startTransition(async () => {
   const now = new Date();
   const result = await checkOutAction({
    profileId,
    date: today,
    checkOut: now.toISOString(),
   });
   if (!result.ok) {
    toast.error(result.error.message);
    return;
   }
   toast.success("Checked out successfully.");
   setCurrent(result.data as unknown as AttendanceRow);
  });
 };

 const hasCheckedIn = !!current?.checkIn;
 const hasCheckedOut = !!current?.checkOut;

 const ATTENDANCE_LABEL: Record<string, string> = {
  PRESENT: "Present",
  HALF_DAY: "Half Day",
  ABSENT: "Absent",
  ON_LEAVE: "On Leave",
 };

 return (
  <div className="rounded-2xl border border-default bg-surface-elevated p-5">
   <h2 className="mb-4 text-base font-semibold text-default">Today&apos;s Attendance</h2>

   <div className="mb-4 space-y-2 text-sm text-muted">
    <div className="flex justify-between">
     <span>Date</span>
     <span className="font-medium text-default">{today}</span>
    </div>
    {current?.checkIn && (
     <div className="flex justify-between">
      <span>Check-in</span>
      <span className="font-medium text-on-success-subtle">
       {new Date(current.checkIn).toLocaleTimeString()}
      </span>
     </div>
    )}
    {current?.checkOut && (
     <div className="flex justify-between">
      <span>Check-out</span>
      <span className="font-medium text-default">
       {new Date(current.checkOut).toLocaleTimeString()}
      </span>
     </div>
    )}
    {current?.status && (
     <div className="flex justify-between">
      <span>Status</span>
      <StatusBadge tone={ATTENDANCE_TONE[current.status] ?? "neutral"}>
       {ATTENDANCE_LABEL[current.status] ?? current.status}
      </StatusBadge>
     </div>
    )}
   </div>

   <div className="flex gap-3">
    {!hasCheckedIn && (
     <button
      type="button"
      onClick={handleCheckIn}
      disabled={isPending}
      className="flex-1 rounded-lg bg-success-subtle0 py-3 text-sm font-semibold text-white hover:bg-success-600 disabled:opacity-50"
     >
      {isPending ? "Please wait…" : "Check In"}
     </button>
    )}
    {hasCheckedIn && !hasCheckedOut && (
     <button
      type="button"
      onClick={handleCheckOut}
      disabled={isPending}
      className="flex-1 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
     >
      {isPending ? "Please wait…" : "Check Out"}
     </button>
    )}
    {hasCheckedIn && hasCheckedOut && (
     <div className="flex-1 rounded-lg bg-surface-inset py-3 text-center text-sm font-medium text-muted">
      Attendance recorded
     </div>
    )}
   </div>
  </div>
 );
}
