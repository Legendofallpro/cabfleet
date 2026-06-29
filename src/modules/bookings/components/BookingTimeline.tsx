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
 CREATE: "bg-primary",
 ASSIGN: "bg-success-500",
 UNASSIGN: "bg-warning-500",
 STATUS_CHANGE: "bg-surface-inset",
 CANCEL: "bg-error-500",
 COMPLETE: "bg-success-500",
 CLAIM: "bg-primary",
};

const fmt = new Intl.DateTimeFormat("en-IN", {
 dateStyle: "medium",
 timeStyle: "short",
});

function TimelineRow({ entry }: { entry: HistoryEntry }) {
 const icon = ACTION_ICON[entry.action] ?? "●";
 const color = ACTION_COLOR[entry.action] ?? "bg-surface-inset";
 const actor = entry.byProfile?.fullName ?? entry.byProfile?.email ?? "System";

 return (
  <li className="relative flex gap-4">
   {/* Vertical line */}
   <span
    className="absolute left-3.5 top-7 h-full w-px -translate-x-1/2 bg-surface-inset"
    aria-hidden
   />
   {/* Dot */}
   <span
    className={`relative mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${color}`}
   >
    {icon}
   </span>
   <div className="pb-5 text-sm">
    <p className="font-medium text-default">
     {entry.action.replaceAll("_", " ")}
    </p>
    {entry.driverId && (
     <p className="text-xs text-muted">Driver ID: {entry.driverId}</p>
    )}
    {entry.vehicleId && (
     <p className="text-xs text-muted">Vehicle ID: {entry.vehicleId}</p>
    )}
    {entry.reason && (
     <p className="mt-0.5 text-xs italic text-muted">&ldquo;{entry.reason}&rdquo;</p>
    )}
    <p className="mt-1 text-xs text-muted">
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
   <h3 className="mb-4 text-sm font-semibold text-default">
    Activity timeline
   </h3>
   <ul className="relative space-y-0">
    {/* Latest status marker */}
    <li className="relative flex gap-4">
     <span
      className="absolute left-3.5 top-7 h-full w-px -translate-x-1/2 bg-surface-inset"
      aria-hidden
     />
     <span className="relative mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-inset text-xs font-bold text-muted">
      ◉
     </span>
     <div className="pb-5 text-sm">
      <p className="font-medium text-default">
       Current: {BOOKING_STATUS_LABEL[status]}
      </p>
     </div>
    </li>

    {assignmentHistory.map((e) => (
     <TimelineRow key={e.id} entry={e} />
    ))}

    {/* Creation event at bottom */}
    <li className="flex gap-4">
     <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-xs font-bold text-on-primary-subtle">
      ✦
     </span>
     <div className="text-sm">
      <p className="font-medium text-default">Booking created</p>
      <p className="text-xs text-muted">
       {fmt.format(new Date(createdAt))}
       {createdBy && ` · ${createdBy.fullName ?? createdBy.email}`}
      </p>
     </div>
    </li>
   </ul>
  </div>
 );
}
