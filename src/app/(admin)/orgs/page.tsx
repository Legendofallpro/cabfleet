/**
 * /admin/orgs — SUPER_ADMIN-only listing of every Organization (Phase 7 W1).
 *
 * Tenant ADMINs cannot reach this page: the page itself checks the role,
 * and even if the route were exposed, the underlying actions gate on
 * `requireRole([SUPER_ADMIN])` so all mutations would still 403.
 */
import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { DataTable, type Column } from "@/components/common/DataTable";
import { DataTableToolbar } from "@/components/common/DataTableToolbar";
import { StatusBadge } from "@/components/common/StatusBadge";
import { parsePageParams } from "@/lib/utils/page-params";
import { getSessionUser } from "@/lib/auth/session";
import { listOrgs } from "@/modules/orgs/queries/org";
import type { Organization } from "@prisma/client";

export const metadata: Metadata = { title: "Organizations | CabFleet" };
export const dynamic = "force-dynamic";

const columns: Column<Organization>[] = [
  {
    header: "Name",
    cell: (o) => (
      <Link
        href={`/orgs/${o.id}`}
        className="font-medium text-default hover:text-primary dark:text-default"
      >
        {o.name}
      </Link>
    ),
  },
  {
    header: "Slug",
    cell: (o) => <span className="font-mono text-xs">{o.slug}</span>,
  },
  {
    header: "Created",
    cell: (o) =>
      new Date(o.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
  },
  {
    header: "Status",
    cell: (o) =>
      o.deletedAt ? (
        <StatusBadge tone="neutral">Deleted</StatusBadge>
      ) : (
        <StatusBadge tone="success">Active</StatusBadge>
      ),
  },
];

export default async function OrgsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSessionUser();
  if (!session || session.profile.role !== "SUPER_ADMIN") {
    redirect("/");
  }

  const { q, page, pageSize } = parsePageParams(await searchParams);
  const { rows, total } = await listOrgs({ q, page, pageSize });

  return (
    <div>
      <PageBreadcrumb pageTitle="Organizations" />
      <div className="space-y-4">
        <DataTableToolbar
          searchPlaceholder="Search by name or slug..."
          total={total}
          pageSize={pageSize}
          createHref="/orgs/new"
          createLabel="Create organization"
        />
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(o) => o.id}
          empty="No organizations yet."
        />
      </div>
    </div>
  );
}
