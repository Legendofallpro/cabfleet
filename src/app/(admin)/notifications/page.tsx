/**
 * /admin/notifications — read-only delivery log (Phase 7 W2).
 *
 * Surfaces:
 *   - The 25 most-recent NotificationLog rows for the active org.
 *   - Any outbox rows in FAILED or DEAD_LETTER status — these need ops
 *     attention (template rejected, provider down, etc).
 *
 * Reuses DataTable; no new common components. Read-only by design — the
 * notification pipeline mutates these rows from the cron drain only.
 */
import { Metadata } from "next";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { DataTable, type Column } from "@/components/common/DataTable";
import { DataTableToolbar } from "@/components/common/DataTableToolbar";
import { StatusBadge, type StatusTone } from "@/components/common/StatusBadge";
import { parsePageParams } from "@/lib/utils/page-params";
import {
  listNotificationLogs,
  listProblemOutbox,
} from "@/modules/notifications/queries/notification";
import type { NotificationLog, NotificationOutbox } from "@prisma/client";

export const metadata: Metadata = { title: "Notifications | CabFleet Admin" };
export const dynamic = "force-dynamic";

const LOG_STATUS_TONE: Record<string, StatusTone> = {
  SENT: "success",
  FAILED: "error",
};

const OUTBOX_TONE: Record<string, StatusTone> = {
  FAILED: "warning",
  DEAD_LETTER: "error",
};

const logColumns: Column<NotificationLog>[] = [
  {
    header: "When",
    cell: (r) => new Date(r.createdAt).toLocaleString(),
  },
  { header: "Channel", cell: (r) => r.channel },
  { header: "Template", cell: (r) => r.templateId },
  { header: "Recipient", cell: (r) => r.recipient },
  {
    header: "Status",
    cell: (r) => (
      <StatusBadge tone={LOG_STATUS_TONE[r.status] ?? "neutral"}>
        {r.status}
      </StatusBadge>
    ),
  },
  {
    header: "Error",
    cell: (r) =>
      r.errorMessage ? (
        <span className="text-caption text-on-error-subtle">
          {r.errorMessage.length > 80
            ? `${r.errorMessage.slice(0, 80)}…`
            : r.errorMessage}
        </span>
      ) : (
        <span className="text-caption text-muted">—</span>
      ),
  },
];

const outboxColumns: Column<NotificationOutbox>[] = [
  {
    header: "Last update",
    cell: (r) => new Date(r.updatedAt).toLocaleString(),
  },
  { header: "Channel", cell: (r) => r.channel },
  { header: "Template", cell: (r) => r.templateId },
  { header: "Recipient", cell: (r) => r.recipient },
  { header: "Attempts", cell: (r) => r.attempts },
  {
    header: "Status",
    cell: (r) => (
      <StatusBadge tone={OUTBOX_TONE[r.status] ?? "neutral"}>
        {r.status}
      </StatusBadge>
    ),
  },
];

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { q, page, pageSize } = parsePageParams(params);
  const statusParam =
    typeof params.status === "string" &&
    (params.status === "SENT" || params.status === "FAILED")
      ? params.status
      : undefined;

  const [{ rows: logs, total }, problemRows] = await Promise.all([
    listNotificationLogs({ q, status: statusParam, page, pageSize }),
    listProblemOutbox(50),
  ]);

  return (
    <div className="space-y-8">
      <PageBreadcrumb pageTitle="Notifications" />

      {problemRows.length > 0 && (
        <section className="space-y-3">
          <header>
            <h2 className="text-default font-semibold">Needs attention</h2>
            <p className="text-caption text-muted">
              Outbox rows in FAILED or DEAD_LETTER status. Dead-letter rows
              don&apos;t auto-retry.
            </p>
          </header>
          <DataTable
            columns={outboxColumns}
            rows={problemRows}
            rowKey={(r) => r.id}
            empty="No problems."
          />
        </section>
      )}

      <section className="space-y-3">
        <header>
          <h2 className="text-default font-semibold">Recent deliveries</h2>
        </header>
        <DataTableToolbar
          searchPlaceholder="Search by recipient or template…"
          total={total}
          pageSize={pageSize}
        />
        <DataTable
          columns={logColumns}
          rows={logs}
          rowKey={(r) => r.id}
          empty="No notifications dispatched yet."
        />
      </section>
    </div>
  );
}
