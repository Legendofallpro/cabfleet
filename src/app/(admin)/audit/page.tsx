import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { DataTable, type Column } from "@/components/common/DataTable";
import { DataTableToolbar } from "@/components/common/DataTableToolbar";
import { parsePageParams } from "@/lib/utils/page-params";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { listAuditLogs, type AuditRow } from "@/modules/audit/queries/audit";
import { formatDateTime } from "@/lib/format/datetime";
import { requireInstallSettings } from "@/modules/install/queries/install";

export const metadata: Metadata = { title: "Audit log | CabFleet Admin" };
export const dynamic = "force-dynamic";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSessionUser();
  if (!session || !hasPermission(session.profile.role, PERMISSIONS.AUDIT_VIEW)) {
    redirect("/dashboard");
  }

  const settings = await requireInstallSettings();
  const when = (d: Date) =>
    formatDateTime(d, {
      locale: settings.locale,
      timeZone: settings.timezone,
      dateStyle: "medium",
      timeStyle: "short",
    });

  const columns: Column<AuditRow>[] = [
    {
      header: "When",
      cell: (r) => when(new Date(r.at)),
    },
  {
    header: "Actor",
    cell: (r) => r.byProfile?.fullName ?? r.byProfile?.email ?? "System",
  },
  {
    header: "Entity",
    cell: (r) => r.entity,
  },
  {
    header: "ID",
    cell: (r) => (
      <span className="font-mono text-xs text-muted">{r.entityId.slice(-12)}</span>
    ),
  },
  {
    header: "Action",
    cell: (r) => r.action,
    },
  ];

  const { q, page, pageSize } = parsePageParams(await searchParams);
  const { rows, total } = await listAuditLogs({ q, page, pageSize });

  return (
    <div className="space-y-4">
      <PageBreadcrumb pageTitle="Audit log" />
      <p className="text-sm text-muted">
        Mutations in this organization. Search by entity name or id.
      </p>
      <DataTableToolbar
        searchPlaceholder="Search entity or id…"
        total={total}
        pageSize={pageSize}
      />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        empty="No audit events yet."
      />
    </div>
  );
}
