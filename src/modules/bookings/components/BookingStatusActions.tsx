"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BookingStatus } from "@prisma/client";

import { StatusBadge } from "@/components/common/StatusBadge";
import {
  BOOKING_STATUS_LABEL,
  STAFF_MANUAL_TRANSITIONS,
  isTerminalStatus,
} from "@/modules/bookings/booking.constants";
import {
  cancelBookingAction,
  transitionBookingAction,
} from "@/modules/bookings/actions/booking.actions";

const STATUS_TONE: Record<
  BookingStatus,
  "success" | "warning" | "error" | "neutral" | "info"
> = {
  PENDING: "warning",
  OPEN_FOR_CLAIM: "info",
  CLAIMED: "info",
  ASSIGNED: "info",
  DRIVER_EN_ROUTE: "info",
  IN_PROGRESS: "success",
  COMPLETED: "success",
  CANCELLED: "neutral",
  NO_SHOW: "neutral",
  FAILED: "error",
};

/** Button colour per target status */
const BUTTON_CLASS: Partial<Record<BookingStatus, string>> = {
  DRIVER_EN_ROUTE:
    "bg-brand-500 text-white hover:bg-brand-600",
  IN_PROGRESS:
    "bg-success-500 text-white hover:bg-success-600",
  COMPLETED:
    "bg-success-600 text-white hover:bg-success-700",
  CANCELLED:
    "bg-error-500 text-white hover:bg-error-600",
  NO_SHOW:
    "bg-warning-500 text-white hover:bg-warning-600",
  FAILED:
    "bg-error-400 text-white hover:bg-error-500",
};

type Props = {
  bookingId: string;
  status: BookingStatus;
};

export function BookingStatusActions({ bookingId, status }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (isTerminalStatus(status)) {
    return (
      <div className="flex items-center gap-2">
        <StatusBadge tone={STATUS_TONE[status]}>
          {BOOKING_STATUS_LABEL[status]}
        </StatusBadge>
        <span className="text-xs text-gray-400">No further actions</span>
      </div>
    );
  }

  const nextStatuses = STAFF_MANUAL_TRANSITIONS[status] ?? [];

  const handleTransition = (toStatus: BookingStatus) => {
    startTransition(async () => {
      if (toStatus === BookingStatus.CANCELLED) {
        const result = await cancelBookingAction({ bookingId, reason: undefined });
        if (!result.ok) { toast.error(result.error.message); return; }
        toast.success("Booking cancelled.");
      } else {
        const result = await transitionBookingAction({ bookingId, toStatus });
        if (!result.ok) { toast.error(result.error.message); return; }
        toast.success(`Status updated to ${BOOKING_STATUS_LABEL[toStatus]}.`);
      }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatusBadge tone={STATUS_TONE[status]}>
        {BOOKING_STATUS_LABEL[status]}
      </StatusBadge>

      {nextStatuses.map((s) => (
        <button
          key={s}
          type="button"
          disabled={pending}
          onClick={() => handleTransition(s)}
          className={`inline-flex h-8 items-center rounded-lg px-3 text-xs font-medium disabled:opacity-50 ${BUTTON_CLASS[s] ?? "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"}`}
        >
          {pending ? "…" : BOOKING_STATUS_LABEL[s]}
        </button>
      ))}
    </div>
  );
}
