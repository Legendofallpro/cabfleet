/**
 * Notification queries — two concerns:
 *
 *  1. Admin log/outbox queries (used by /admin/notifications page).
 *  2. Header bell summary (used by admin layout + AppHeader).
 */
import { db } from "@/lib/db";
import type { NotificationChannel } from "@prisma/client";

// ---------------------------------------------------------------------------
// Admin notification log + outbox
// ---------------------------------------------------------------------------

export type ListNotificationLogsParams = {
  q?: string;
  status?: "SENT" | "FAILED";
  channel?: NotificationChannel;
  page?: number;
  pageSize?: number;
};

export async function listNotificationLogs({
  q = "",
  status,
  channel,
  page = 1,
  pageSize = 25,
}: ListNotificationLogsParams) {
  const where = {
    ...(status ? { status } : {}),
    ...(channel ? { channel } : {}),
    ...(q
      ? {
          OR: [
            { recipient: { contains: q, mode: "insensitive" as const } },
            { templateId: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    db.notificationLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.notificationLog.count({ where }),
  ]);
  return { rows, total };
}

/**
 * Dead-letter and currently-failing outbox rows — the rest of the queue
 * drains in <2h so isn't interesting to show in an admin view.
 */
export async function listProblemOutbox(limit = 50) {
  return db.notificationOutbox.findMany({
    where: { status: { in: ["DEAD_LETTER", "FAILED"] } },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
}

// ---------------------------------------------------------------------------
// Header bell summary
// ---------------------------------------------------------------------------

export type HeaderNotificationItem = {
  id: string;
  title: string;
  subtitle: string;
  createdAt: Date;
};

export type HeaderNotificationSummary = {
  items: HeaderNotificationItem[];
  hasRecent: boolean;
};

const CHANNEL_LABEL: Record<string, string> = {
  EMAIL: "Email",
  WHATSAPP: "WhatsApp",
  SMS: "SMS",
};

/**
 * Recent org notification dispatches for the admin header bell.
 * Surfaces the notification module without a full inbox UI.
 */
export async function getHeaderNotificationSummary(
  orgId: string | null,
  limit = 5,
): Promise<HeaderNotificationSummary> {
  if (!orgId) {
    return { items: [], hasRecent: false };
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const rows = await db.notificationLog.findMany({
    where: { orgId, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      channel: true,
      templateId: true,
      status: true,
      createdAt: true,
    },
  });

  const items: HeaderNotificationItem[] = rows.map((row) => ({
    id: row.id,
    title: `${CHANNEL_LABEL[row.channel] ?? row.channel} · ${row.templateId}`,
    subtitle: row.status === "SENT" ? "Delivered" : "Failed to send",
    createdAt: row.createdAt,
  }));

  return { items, hasRecent: items.length > 0 };
}
