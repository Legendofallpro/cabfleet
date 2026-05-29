import { Metadata } from "next";
import Link from "next/link";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { DataTable, type Column } from "@/components/common/DataTable";
import { DataTableToolbar } from "@/components/common/DataTableToolbar";
import { parsePageParams } from "@/lib/utils/page-params";
import { StatusBadge } from "@/components/common/StatusBadge";
import { listVehicles } from "@/modules/vehicles/queries/vehicle";
import type { Vehicle, VehicleStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Vehicles | CabFleet Admin" };

type Row = Vehicle & { branch: { id: string; name: string; code: string } };

const TONE: Record<VehicleStatus, "success" | "warning" | "info" | "neutral"> = {
 AVAILABLE: "success",
 ON_TRIP: "info",
 MAINTENANCE: "warning",
 INACTIVE: "neutral",
};

const columns: Column<Row>[] = [
 {
  header: "Vehicle",
  cell: (v) => (
   <div className="flex flex-col">
    <Link
     href={`/vehicles/${v.id}`}
     className="font-medium text-default hover:text-primary dark:text-default"
    >
     {v.registrationNumber}
    </Link>
    <span className="text-xs text-muted">
     {v.make} {v.model} ({v.year})
    </span>
   </div>
  ),
 },
 { header: "Branch", cell: (v) => v.branch.code },
 { header: "Type", cell: (v) => v.type },
 { header: "Capacity", cell: (v) => v.capacity },
 {
  header: "Status",
  cell: (v) => <StatusBadge tone={TONE[v.status]}>{v.status.replaceAll("_", " ")}</StatusBadge>,
 },
];

export default async function VehiclesPage({
 searchParams,
}: {
 searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
 const { q, page, pageSize } = parsePageParams(await searchParams);
 const { rows, total } = await listVehicles({ q, page, pageSize });

 return (
  <div>
   <PageBreadcrumb pageTitle="Vehicles" />
   <div className="space-y-4">
    <DataTableToolbar
     searchPlaceholder="Search by reg, make or model..."
     total={total}
     pageSize={pageSize}
     createHref="/vehicles/new"
     createLabel="Add vehicle"
    />
    <DataTable
     columns={columns}
     rows={rows}
     rowKey={(v) => v.id}
     empty="No vehicles yet. Add your first fleet vehicle to begin operations."
    />
   </div>
  </div>
 );
}
