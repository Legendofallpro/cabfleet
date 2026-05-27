"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { checkInAction, checkOutAction } from "@/modules/attendance/actions/attendance.actions";
import type { AttendanceRow } from "@/modules/attendance/queries/attendance";

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
      setCurrent(result.data as AttendanceRow);
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
      setCurrent(result.data as AttendanceRow);
    });
  };

  const hasCheckedIn = !!current?.checkIn;
  const hasCheckedOut = !!current?.checkOut;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">
        Today&apos;s Attendance
      </h2>

      <div className="mb-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex justify-between">
          <span>Date</span>
          <span className="font-medium text-gray-800 dark:text-white/80">{today}</span>
        </div>
        {current?.checkIn && (
          <div className="flex justify-between">
            <span>Check-in</span>
            <span className="font-medium text-success-600 dark:text-success-400">
              {new Date(current.checkIn).toLocaleTimeString()}
            </span>
          </div>
        )}
        {current?.checkOut && (
          <div className="flex justify-between">
            <span>Check-out</span>
            <span className="font-medium text-gray-800 dark:text-white/80">
              {new Date(current.checkOut).toLocaleTimeString()}
            </span>
          </div>
        )}
        {current?.status && (
          <div className="flex justify-between">
            <span>Status</span>
            <StatusBadge status={current.status} />
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {!hasCheckedIn && (
          <button
            type="button"
            onClick={handleCheckIn}
            disabled={isPending}
            className="flex-1 rounded-lg bg-success-500 py-3 text-sm font-semibold text-white hover:bg-success-600 disabled:opacity-50"
          >
            {isPending ? "Please wait…" : "Check In"}
          </button>
        )}
        {hasCheckedIn && !hasCheckedOut && (
          <button
            type="button"
            onClick={handleCheckOut}
            disabled={isPending}
            className="flex-1 rounded-lg bg-brand-500 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {isPending ? "Please wait…" : "Check Out"}
          </button>
        )}
        {hasCheckedIn && hasCheckedOut && (
          <div className="flex-1 rounded-lg bg-gray-100 py-3 text-center text-sm font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            Attendance recorded
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PRESENT: "bg-success-100 text-success-700 dark:bg-success-500/20 dark:text-success-400",
    HALF_DAY: "bg-warning-100 text-warning-700 dark:bg-warning-500/20 dark:text-warning-400",
    ABSENT: "bg-error-100 text-error-700 dark:bg-error-500/20 dark:text-error-400",
    ON_LEAVE: "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400",
  };
  const label: Record<string, string> = {
    PRESENT: "Present",
    HALF_DAY: "Half Day",
    ABSENT: "Absent",
    ON_LEAVE: "On Leave",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? ""}`}>
      {label[status] ?? status}
    </span>
  );
}
