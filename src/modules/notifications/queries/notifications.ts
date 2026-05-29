/**
 * Notification log + outbox queries (Phase 7 W2 admin UI).
 *
 * The /admin/notifications page reads from these. Both queries respect the
 * active org context — a tenant ADMIN sees only their org's notifications;
 * SUPER_ADMIN under `runWithoutOrg(...)` sees everything (handled by the
 * Prisma extension automatically).
 */
import { db } from "@/lib/db";
import type { NotificationChannel } from "@prisma/client";

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
