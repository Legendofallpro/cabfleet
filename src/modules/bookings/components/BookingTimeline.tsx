import { type BookingDetail } from "@/modules/bookings/types";
import { BOOKING_STATUS_LABEL } from "@/modules/bookings/booking.constants";
import type { AuditAction } from "@prisma/client";

type HistoryEntry = BookingDetail["assignmentHistory"][number];

const ACTION_ICON: Partial<Record<AuditAction, string>> = {
  CREATE: "●",
  ASSIGN: "⊕",
  UNASSIGN: "⊖",
  STATUS_CHANGE: "↺",
  CANCEL: "✕",
  COMPLETE: "✓",
  CLAIM: "⊙",
};

const ACTION_COLOR: Partial<Record<AuditAction, string>> = {
  CREATE: "bg-brand-500",
  ASSIGN: "bg-success-500",
  UNASSIGN: "bg-warning-500",
  STATUS_CHANGE: "bg-gray-400",
  CANCEL: "bg-error-500",
  COMPLETE: "bg-success-500",
  CLAIM: "bg-brand-400",
};

const fmt = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

function TimelineRow({ entry }: { entry: HistoryEntry }) {
  const icon = ACTION_ICON[entry.action] ?? "●";
  const color = ACTION_COLOR[entry.action] ?? "bg-gray-400";
  const actor = entry.byProfile?.fullName ?? entry.byProfile?.email ?? "System";

  return (
    <li className="relative flex gap-4">
      {/* Vertical line */}
      <span
        className="absolute left-3.5 top-7 h-full w-px -translate-x-1/2 bg-gray-200 dark:bg-gray-700"
        aria-hidden
      />
      {/* Dot */}
      <span
        className={`relative mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${color}`}
      >
        {icon}
      </span>
      <div className="pb-5 text-sm">
        <p className="font-medium text-gray-800 dark:text-white/90">
          {entry.action.replaceAll("_", " ")}
        </p>
        {entry.driverId && (
          <p className="text-xs text-gray-500">Driver ID: {entry.driverId}</p>
        )}
        {entry.vehicleId && (
          <p className="text-xs text-gray-500">Vehicle ID: {entry.vehicleId}</p>
        )}
        {entry.reason && (
          <p className="mt-0.5 text-xs italic text-gray-500">&ldquo;{entry.reason}&rdquo;</p>
        )}
        <p className="mt-1 text-xs text-gray-400">
          {fmt.format(new Date(entry.at))} &middot; {actor}
        </p>
      </div>
    </li>
  );
}

type Props = {
  booking: Pick<BookingDetail, "status" | "createdAt" | "assignmentHistory" | "createdBy">;
};

export function BookingTimeline({ booking }: Props) {
  const { assignmentHistory, createdAt, createdBy, status } = booking;

  return (
    <div>
      <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
        Activity timeline
      </h3>
      <ul className="relative space-y-0">
        {/* Latest status marker */}
        <li className="relative flex gap-4">
          <span
            className="absolute left-3.5 top-7 h-full w-px -translate-x-1/2 bg-gray-200 dark:bg-gray-700"
            aria-hidden
          />
          <span className="relative mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            ◉
          </span>
          <div className="pb-5 text-sm">
            <p className="font-medium text-gray-800 dark:text-white/90">
              Current: {BOOKING_STATUS_LABEL[status]}
            </p>
          </div>
        </li>

        {assignmentHistory.map((e) => (
          <TimelineRow key={e.id} entry={e} />
        ))}

        {/* Creation event at bottom */}
        <li className="flex gap-4">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-600 dark:bg-brand-900 dark:text-brand-300">
            ✦
          </span>
          <div className="text-sm">
            <p className="font-medium text-gray-800 dark:text-white/90">Booking created</p>
            <p className="text-xs text-gray-400">
              {fmt.format(new Date(createdAt))}
              {createdBy && ` · ${createdBy.fullName ?? createdBy.email}`}
            </p>
          </div>
        </li>
      </ul>
    </div>
  );
}
