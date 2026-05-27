import { db } from "@/lib/db";

export interface ListExpensesOpts {
  profileId?: string;
  vehicleId?: string;
  category?: string;
  from?: Date;
  to?: Date;
  pageSize?: number;
  page?: number;
}

const expenseSelect = {
  id: true,
  profileId: true,
  vehicleId: true,
  category: true,
  amount: true,
  receiptUrl: true,
  notes: true,
  at: true,
  createdAt: true,
  profile: { select: { id: true, fullName: true, email: true } },
  vehicle: { select: { id: true, registrationNumber: true, make: true, model: true } },
} as const;

export type ExpenseRow = Awaited<ReturnType<typeof listExpenses>>["rows"][number];

export async function listExpenses(opts: ListExpensesOpts = {}) {
  const pageSize = opts.pageSize ?? 30;
  const page = opts.page ?? 1;
  const skip = (page - 1) * pageSize;

  const where = {
    ...(opts.profileId ? { profileId: opts.profileId } : {}),
    ...(opts.vehicleId ? { vehicleId: opts.vehicleId } : {}),
    ...(opts.category ? { category: opts.category } : {}),
    ...(opts.from || opts.to
      ? {
          at: {
            ...(opts.from ? { gte: opts.from } : {}),
            ...(opts.to ? { lte: opts.to } : {}),
          },
        }
      : {}),
  };

  const [rows, total] = await db.$transaction([
    db.expense.findMany({
      where,
      orderBy: { at: "desc" },
      skip,
      take: pageSize,
      select: expenseSelect,
    }),
    db.expense.count({ where }),
  ]);

  return { rows, total };
}
