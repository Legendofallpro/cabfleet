import { db } from "@/lib/db";

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
