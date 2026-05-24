import { Metadata } from "next";
import Link from "next/link";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { DataTable, type Column } from "@/components/common/DataTable";
import {
  DataTableToolbar,
  parsePageParams,
} from "@/components/common/DataTableToolbar";
import { StatusBadge } from "@/components/common/StatusBadge";
import { listStaff } from "@/modules/staff/queries/list";
import type { StaffStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Staff | CabFleet Admin" };

type Row = Awaited<ReturnType<typeof listStaff>>["rows"][number];

const TONE: Record<StaffStatus, "success" | "warning" | "neutral"> = {
  ACTIVE: "success",
  ON_LEAVE: "warning",
  INACTIVE: "neutral",
};

const columns: Column<Row>[] = [
  {
    header: "Name",
    cell: (s) => (
      <div className="flex flex-col">
        <Link
          href={`/staff/${s.id}`}
          className="font-medium text-gray-900 hover:text-brand-500 dark:text-white/90"
        >
          {s.profile.fullName ?? s.profile.email}
        </Link>
        <span className="text-xs text-gray-500">{s.profile.email}</span>
      </div>
    ),
  },
  { header: "Employee ID", cell: (s) => <span className="font-mono text-xs">{s.employeeId}</span> },
  { header: "Designation", cell: (s) => s.designation },
  { header: "Role", cell: (s) => s.profile.role },
  { header: "Branch", cell: (s) => s.profile.branch?.code ?? "—" },
  {
    header: "Status",
    cell: (s) => <StatusBadge tone={TONE[s.status]}>{s.status.replaceAll("_", " ")}</StatusBadge>,
  },
];

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { q, page, pageSize } = parsePageParams(await searchParams);
  const { rows, total } = await listStaff({ q, page, pageSize });

  return (
    <div>
      <PageBreadcrumb pageTitle="Staff" />
      <div className="space-y-4">
        <DataTableToolbar
          searchPlaceholder="Search by name, email or employee ID..."
          total={total}
          pageSize={pageSize}
          createHref="/staff/new"
          createLabel="Invite staff"
        />
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(s) => s.id}
          empty="No staff yet. Invite an admin or dispatcher to begin."
        />
      </div>
    </div>
  );
}
