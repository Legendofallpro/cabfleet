import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export type ListStaffParams = {
  q?: string;
  page?: number;
  pageSize?: number;
};

export async function listStaff({ q = "", page = 1, pageSize = 20 }: ListStaffParams) {
  const where: Prisma.StaffWhereInput = {
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { employeeId: { contains: q, mode: "insensitive" } },
            { profile: { fullName: { contains: q, mode: "insensitive" } } },
            { profile: { email: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    db.staff.findMany({
      where,
      include: {
        profile: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
            branchId: true,
            branch: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.staff.count({ where }),
  ]);

  return { rows, total };
}

export function getStaff(id: string) {
  return db.staff.findFirst({
    where: { id, deletedAt: null },
    include: {
      profile: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          branchId: true,
        },
      },
    },
  });
}
