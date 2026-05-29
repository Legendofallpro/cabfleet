import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export type ListCustomersParams = {
  q?: string;
  page?: number;
  pageSize?: number;
};

export async function listCustomers({
  q = "",
  page = 1,
  pageSize = 20,
}: ListCustomersParams) {
  const where: Prisma.CustomerWhereInput = {
    deletedAt: null,
    ...(q
      ? {
          profile: {
            OR: [
              { fullName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
            ],
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    db.customer.findMany({
      where,
      include: {
        profile: { select: { id: true, fullName: true, email: true, phone: true } },
      },
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.customer.count({ where }),
  ]);

  return { rows, total };
}
