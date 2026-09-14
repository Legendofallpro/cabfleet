import Link from "next/link";
import { BookingStatus } from "@prisma/client";
import { BOOKING_STATUS_LABEL } from "@/modules/bookings/booking.constants";
import { cn } from "@/lib/cn";

const CHIP_STATUSES: Array<BookingStatus | ""> = [
  "",
  BookingStatus.PENDING,
  BookingStatus.CLAIMED,
  BookingStatus.OPEN_FOR_CLAIM,
  BookingStatus.ASSIGNED,
  BookingStatus.DRIVER_EN_ROUTE,
  BookingStatus.IN_PROGRESS,
  BookingStatus.COMPLETED,
];

export function BookingStatusChips({
  current,
  q,
}: {
  current?: BookingStatus;
  q?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {CHIP_STATUSES.map((status) => {
        const active = (current ?? "") === status;
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (status) params.set("status", status);
        const href = params.toString() ? `/bookings?${params.toString()}` : "/bookings";
        return (
          <Link
            key={status || "all"}
            href={href}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-medium",
              active
                ? "border-primary bg-primary-subtle text-on-primary-subtle"
                : "border-default bg-surface-elevated text-muted hover:bg-surface-inset",
            )}
          >
            {status ? BOOKING_STATUS_LABEL[status] : "All"}
          </Link>
        );
      })}
    </div>
  );
}
