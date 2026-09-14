import Link from "next/link";
import { StatusBadge } from "@/components/common/StatusBadge";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import {
  BOOKING_STATUS_LABEL,
  BOOKING_STATUS_TONE,
} from "@/modules/bookings/booking.constants";
import type { DeskQueueRow } from "@/modules/bookings/queries/desk-queue";

const dtFmt = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

function QueueList({
  title,
  hint,
  rows,
  empty,
}: {
  title: string;
  hint?: string;
  rows: DeskQueueRow[];
  empty: string;
}) {
  return (
    <SurfaceCard title={title}>
      {hint ? <p className="mb-3 text-sm text-muted">{hint}</p> : null}
      {rows.length === 0 ? (
        <p className="py-6 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-default">
          {rows.map((row) => (
            <li key={row.id} className="py-3 first:pt-0 last:pb-0">
              <Link href={`/bookings/${row.id}`} className="block hover:opacity-90">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-default">{row.customerName}</span>
                  <div className="flex items-center gap-2">
                    {row.needsVehicle ? (
                      <StatusBadge tone="warning">Needs vehicle</StatusBadge>
                    ) : null}
                    <StatusBadge tone={BOOKING_STATUS_TONE[row.status]}>
                      {BOOKING_STATUS_LABEL[row.status]}
                    </StatusBadge>
                  </div>
                </div>
                <p className="mt-1 truncate text-sm text-muted">
                  {row.pickupAddress} → {row.dropAddress}
                </p>
                <p className="text-xs text-muted">{dtFmt.format(row.pickupAt)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SurfaceCard>
  );
}

export function DeskQueue({
  needsAssign,
  openForClaim,
  active,
  unpaidCompleted,
}: {
  needsAssign: DeskQueueRow[];
  openForClaim: DeskQueueRow[];
  active: DeskQueueRow[];
  unpaidCompleted: DeskQueueRow[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <QueueList
        title="Needs assign"
        hint="Pending bookings and claimed trips waiting for a vehicle."
        rows={needsAssign}
        empty="Nothing waiting to assign."
      />
      <QueueList
        title="Open for claim"
        rows={openForClaim}
        empty="No open-claim trips."
      />
      <QueueList
        title="Active now"
        rows={active}
        empty="No trips on the road."
      />
      <QueueList
        title="Unpaid completed"
        rows={unpaidCompleted}
        empty="No outstanding completed fares."
      />
    </div>
  );
}
