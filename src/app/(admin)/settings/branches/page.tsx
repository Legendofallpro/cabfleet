import { Metadata } from "next";
import Link from "next/link";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { DataTable, type Column } from "@/components/common/DataTable";
import { DataTableToolbar } from "@/components/common/DataTableToolbar";
import { parsePageParams } from "@/lib/utils/page-params";
import { StatusBadge } from "@/components/common/StatusBadge";
import { listBranches } from "@/modules/branches/queries/list";
import type { Branch } from "@prisma/client";

export const metadata: Metadata = { title: "Branches | CabFleet Admin" };

const columns: Column<Branch>[] = [
  {
    header: "Name",
    cell: (b) => (
      <Link
        href={`/settings/branches/${b.id}`}
        className="font-medium text-gray-900 hover:text-brand-500 dark:text-white/90"
      >
        {b.name}
      </Link>
    ),
  },
  { header: "Code", cell: (b) => <span className="font-mono text-xs">{b.code}</span> },
  { header: "Timezone", cell: (b) => b.timezone },
  { header: "Dispatch", cell: (b) => b.defaultDispatch },
  {
    header: "Status",
    cell: (b) =>
      b.active ? (
        <StatusBadge tone="success">Active</StatusBadge>
      ) : (
        <StatusBadge tone="neutral">Inactive</StatusBadge>
      ),
  },
];

export default async function BranchesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { q, page, pageSize } = parsePageParams(await searchParams);
  const { rows, total } = await listBranches({ q, page, pageSize });

  return (
    <div>
      <PageBreadcrumb pageTitle="Branches" />
      <div className="space-y-4">
        <DataTableToolbar
          searchPlaceholder="Search by name or code..."
          total={total}
          pageSize={pageSize}
          createHref="/settings/branches/new"
          createLabel="Add branch"
        />
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(b) => b.id}
          empty="No branches yet. Create one to start onboarding vehicles and drivers."
        />
      </div>
    </div>
  );
}
