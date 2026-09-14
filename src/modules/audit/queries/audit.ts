import { db } from "@/lib/db";

export type ListAuditParams = {
  q?: string;
  page?: number;
  pageSize?: number;
};

export async function listAuditLogs({
  q = "",
  page = 1,
  pageSize = 20,
}: ListAuditParams) {
  const where = q
    ? {
        OR: [
          { entity: { contains: q, mode: "insensitive" as const } },
          { entityId: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [rows, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        at: true,
        entity: true,
        entityId: true,
        action: true,
        byProfile: { select: { fullName: true, email: true } },
      },
    }),
    db.auditLog.count({ where }),
  ]);

  return { rows, total };
}

export type AuditRow = Awaited<ReturnType<typeof listAuditLogs>>["rows"][number];
