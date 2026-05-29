import { Metadata } from "next";
import Link from "next/link";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { DataTable, type Column } from "@/components/common/DataTable";
import { DataTableToolbar } from "@/components/common/DataTableToolbar";
import { parsePageParams } from "@/lib/utils/page-params";
import { StatusBadge } from "@/components/common/StatusBadge";
import { listDrivers } from "@/modules/drivers/queries/driver";
import type { DriverStatus, DriverVerificationStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Drivers | CabFleet Admin" };

type Row = Awaited<ReturnType<typeof listDrivers>>["rows"][number];

const STATUS_TONE: Record<DriverStatus, "success" | "warning" | "error" | "neutral"> = {
 ACTIVE: "success",
 ON_LEAVE: "warning",
 SUSPENDED: "error",
 INACTIVE: "neutral",
};

const VERIFY_TONE: Record<DriverVerificationStatus, "success" | "warning" | "error" | "neutral"> = {
 VERIFIED: "success",
 PENDING: "warning",
 REJECTED: "error",
 UNVERIFIED: "neutral",
};

const columns: Column<Row>[] = [
 {
  header: "Driver",
  cell: (d) => (
   <div className="flex flex-col">
    <Link
     href={`/drivers/${d.id}`}
     className="font-medium text-default hover:text-primary dark:text-default"
    >
     {d.profile.fullName ?? d.profile.email}
    </Link>
    <span className="text-xs text-muted">{d.profile.email}</span>
   </div>
  ),
 },
 { header: "Phone", cell: (d) => d.profile.phone ?? "—" },
 { header: "Branch", cell: (d) => d.profile.branch?.code ?? "—" },
 { header: "License", cell: (d) => <span className="font-mono text-xs">{d.licenseNumber}</span> },
 {
  header: "Status",
  cell: (d) => <StatusBadge tone={STATUS_TONE[d.status]}>{d.status.replaceAll("_", " ")}</StatusBadge>,
 },
 {
  header: "Verification",
  cell: (d) => <StatusBadge tone={VERIFY_TONE[d.verification]}>{d.verification.replaceAll("_", " ")}</StatusBadge>,
 },
];

export default async function DriversPage({
 searchParams,
}: {
 searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
 const { q, page, pageSize } = parsePageParams(await searchParams);
 const { rows, total } = await listDrivers({ q, page, pageSize });

 return (
  <div>
   <PageBreadcrumb pageTitle="Drivers" />
   <div className="space-y-4">
    <DataTableToolbar
     searchPlaceholder="Search by name, email or license..."
     total={total}
     pageSize={pageSize}
     createHref="/drivers/new"
     createLabel="Invite driver"
    />
    <DataTable
     columns={columns}
     rows={rows}
     rowKey={(d) => d.id}
     empty="No drivers yet. Invite your first driver to start dispatching."
    />
   </div>
  </div>
 );
}
