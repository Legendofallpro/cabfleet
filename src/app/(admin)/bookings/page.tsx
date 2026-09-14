import { Metadata } from "next";
import Link from "next/link";
import { BookingStatus } from "@prisma/client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { DataTable, type Column } from "@/components/common/DataTable";
import { DataTableToolbar } from "@/components/common/DataTableToolbar";
import { StatusBadge } from "@/components/common/StatusBadge";
import { parsePageParams } from "@/lib/utils/page-params";
import { listBookings } from "@/modules/bookings/queries/booking";
import { BookingStatusChips } from "@/modules/bookings/components/BookingStatusChips";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_TONE } from "@/modules/bookings/booking.constants";
import type { BookingListRow } from "@/modules/bookings/types";

export const metadata: Metadata = { title: "Bookings | CabFleet Admin" };

const fmt = new Intl.DateTimeFormat("en-IN", {
 dateStyle: "medium",
 timeStyle: "short",
});
const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const columns: Column<BookingListRow>[] = [
 {
  header: "ID / Route",
  cell: (b) => (
   <div className="flex flex-col gap-0.5">
    <Link
     href={`/bookings/${b.id}`}
     className="font-mono text-xs font-medium text-primary hover:text-primary dark:text-primary"
    >
     {b.id.slice(-8).toUpperCase()}
    </Link>
    <span className="max-w-[200px] truncate text-xs text-muted">
     {b.pickupAddress} → {b.dropAddress}
    </span>
   </div>
  ),
 },
 {
  header: "Customer",
  cell: (b) => (
   <span className="text-sm">{b.customer.profile.fullName ?? b.customer.profile.email}</span>
  ),
 },
 { header: "Type", cell: (b) => b.bookingType.name },
 { header: "Branch", cell: (b) => b.branch.code },
 {
  header: "Pickup",
  cell: (b) => (
   <span className="whitespace-nowrap text-xs">{fmt.format(new Date(b.pickupAt))}</span>
  ),
 },
 {
  header: "Driver",
  cell: (b) =>
   b.assignedDriver ? (
    <span className="text-xs">{b.assignedDriver.profile.fullName ?? "—"}</span>
   ) : (
    <span className="text-xs text-muted">Unassigned</span>
   ),
 },
 {
  header: "Fare Est.",
  cell: (b) =>
   b.fareEstimate != null ? (
    <span className="text-xs">{currency.format(Number(b.fareEstimate))}</span>
   ) : (
    <span className="text-xs text-muted">—</span>
   ),
 },
 {
  header: "Status",
  cell: (b) => (
   <StatusBadge tone={BOOKING_STATUS_TONE[b.status]}>
    {BOOKING_STATUS_LABEL[b.status]}
   </StatusBadge>
  ),
 },
];

export default async function BookingsPage({
 searchParams,
}: {
 searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
 const raw = await searchParams;
 const { q, page, pageSize } = parsePageParams(raw);
 const statusFilter =
  typeof raw.status === "string" && raw.status in BookingStatus
   ? (raw.status as BookingStatus)
   : undefined;

 const { rows, total } = await listBookings({ q, page, pageSize, status: statusFilter });

 return (
  <div>
   <PageBreadcrumb pageTitle="Bookings" />
   <div className="space-y-4">
    <BookingStatusChips current={statusFilter} q={q} />
    <DataTableToolbar
     searchPlaceholder="Search by address or customer..."
     total={total}
     pageSize={pageSize}
     createHref="/bookings/new"
     createLabel="New booking"
    />
    <DataTable
     columns={columns}
     rows={rows}
     rowKey={(b) => b.id}
     empty="No bookings yet. Create a booking to get started."
    />
   </div>
  </div>
 );
}
