import { BookingStatus } from "@prisma/client";
import { db } from "@/lib/db";

const QUEUE_LIMIT = 8;
/** Extra completed rows to scan for unpaid fare after live queues are fetched separately. */
const COMPLETED_SCAN = 40;

export type DeskQueueRow = {
  id: string;
  status: BookingStatus;
  pickupAt: Date;
  pickupAddress: string;
  dropAddress: string;
  customerName: string;
  needsVehicle: boolean;
};

type SourceRow = {
  id: string;
  status: BookingStatus;
  pickupAt: Date;
  pickupAddress: string;
  dropAddress: string;
  fareEstimate: { toString(): string } | number | null;
  fareFinal: { toString(): string } | number | null;
  tollAmount: { toString(): string } | number;
  parkingAmount: { toString(): string } | number;
  assignedVehicleId: string | null;
  customer: { profile: { fullName: string | null } };
  payments: { amount: { toString(): string } | number }[];
};

const deskQueueSelect = {
  id: true,
  status: true,
  pickupAt: true,
  pickupAddress: true,
  dropAddress: true,
  fareEstimate: true,
  fareFinal: true,
  tollAmount: true,
  parkingAmount: true,
  assignedVehicleId: true,
  customer: { select: { profile: { select: { fullName: true } } } },
  payments: {
    where: { deletedAt: null, status: "CAPTURED" as const },
    select: { amount: true },
  },
} as const;

/** fareFinal already includes toll/parking (set on COMPLETED). Do not add extras twice. */
export function billedTotal(row: SourceRow): number {
  if (row.fareFinal != null) return Number(row.fareFinal);
  return Number(row.fareEstimate ?? 0) + Number(row.tollAmount ?? 0) + Number(row.parkingAmount ?? 0);
}

function capturedTotal(row: SourceRow): number {
  return row.payments.reduce((sum, p) => sum + Number(p.amount), 0);
}

function isUnpaid(row: SourceRow): boolean {
  return billedTotal(row) - capturedTotal(row) > 0.009;
}

function toRow(row: SourceRow): DeskQueueRow {
  return {
    id: row.id,
    status: row.status,
    pickupAt: row.pickupAt,
    pickupAddress: row.pickupAddress,
    dropAddress: row.dropAddress,
    customerName: row.customer.profile.fullName ?? "—",
    needsVehicle: row.status === BookingStatus.CLAIMED && !row.assignedVehicleId,
  };
}

export function partitionDeskQueue(rows: SourceRow[]): {
  needsAssign: DeskQueueRow[];
  openForClaim: DeskQueueRow[];
  active: DeskQueueRow[];
  unpaidCompleted: DeskQueueRow[];
} {
  const needsAssign: DeskQueueRow[] = [];
  const openForClaim: DeskQueueRow[] = [];
  const active: DeskQueueRow[] = [];
  const unpaidCompleted: DeskQueueRow[] = [];

  for (const row of rows) {
    if (row.status === BookingStatus.PENDING || row.status === BookingStatus.CLAIMED) {
      needsAssign.push(toRow(row));
    } else if (row.status === BookingStatus.OPEN_FOR_CLAIM) {
      openForClaim.push(toRow(row));
    } else if (
      row.status === BookingStatus.ASSIGNED ||
      row.status === BookingStatus.DRIVER_EN_ROUTE ||
      row.status === BookingStatus.IN_PROGRESS
    ) {
      active.push(toRow(row));
    } else if (row.status === BookingStatus.COMPLETED && isUnpaid(row)) {
      unpaidCompleted.push(toRow(row));
    }
  }

  return {
    needsAssign: needsAssign.slice(0, QUEUE_LIMIT),
    openForClaim: openForClaim.slice(0, QUEUE_LIMIT),
    active: active.slice(0, QUEUE_LIMIT),
    unpaidCompleted: unpaidCompleted.slice(0, QUEUE_LIMIT),
  };
}

export async function getDeskQueue() {
  const [needsAssignRows, openRows, activeRows, completedRows] = await Promise.all([
    db.booking.findMany({
      where: {
        deletedAt: null,
        status: { in: [BookingStatus.PENDING, BookingStatus.CLAIMED] },
      },
      orderBy: { pickupAt: "asc" },
      take: QUEUE_LIMIT,
      select: deskQueueSelect,
    }),
    db.booking.findMany({
      where: { deletedAt: null, status: BookingStatus.OPEN_FOR_CLAIM },
      orderBy: { pickupAt: "asc" },
      take: QUEUE_LIMIT,
      select: deskQueueSelect,
    }),
    db.booking.findMany({
      where: {
        deletedAt: null,
        status: {
          in: [BookingStatus.ASSIGNED, BookingStatus.DRIVER_EN_ROUTE, BookingStatus.IN_PROGRESS],
        },
      },
      orderBy: { pickupAt: "asc" },
      take: QUEUE_LIMIT,
      select: deskQueueSelect,
    }),
    db.booking.findMany({
      where: { deletedAt: null, status: BookingStatus.COMPLETED },
      orderBy: { pickupAt: "desc" },
      take: COMPLETED_SCAN,
      select: deskQueueSelect,
    }),
  ]);

  return {
    needsAssign: needsAssignRows.map(toRow),
    openForClaim: openRows.map(toRow),
    active: activeRows.map(toRow),
    unpaidCompleted: completedRows.filter(isUnpaid).slice(0, QUEUE_LIMIT).map(toRow),
  };
}
