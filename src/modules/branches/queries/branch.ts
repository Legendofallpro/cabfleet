import { db } from "@/lib/db";

export type ListBranchesParams = {
  q?: string;
  page?: number;
  pageSize?: number;
};

export async function listBranches({ q = "", page = 1, pageSize = 20 }: ListBranchesParams) {
  const where = {
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { code: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    db.branch.findMany({
      where,
      orderBy: [{ active: "desc" }, { name: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.branch.count({ where }),
  ]);

  return { rows, total };
}

export function getBranch(id: string) {
  return db.branch.findFirst({ where: { id, deletedAt: null } });
}

/** Lightest active-branch list for selects and form dropdowns. */
export function listActiveBranchesFlat() {
  return db.branch.findMany({
    where: { deletedAt: null, active: true },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });
}

/** Returns the first active branch (oldest by creation date) for single-branch setups. */
export function getDefaultBranch() {
  return db.branch.findFirst({
    where: { deletedAt: null, active: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });
}
