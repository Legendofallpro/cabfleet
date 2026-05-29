import { db } from "@/lib/db";

export interface ListShiftsOpts {
  branchId?: string;
  staffId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

const shiftSelect = {
  id: true,
  branchId: true,
  staffId: true,
  startsAt: true,
  endsAt: true,
  notes: true,
  createdAt: true,
  branch: { select: { id: true, name: true, code: true } },
  staff: {
    select: {
      id: true,
      employeeId: true,
      profile: { select: { id: true, fullName: true, email: true } },
    },
  },
} as const;

export type ShiftRow = Awaited<ReturnType<typeof listShifts>>["rows"][number];

export async function listShifts(opts: ListShiftsOpts = {}) {
  const pageSize = opts.pageSize ?? 30;
  const page = opts.page ?? 1;
  const skip = (page - 1) * pageSize;

  const where = {
    ...(opts.branchId ? { branchId: opts.branchId } : {}),
    ...(opts.staffId ? { staffId: opts.staffId } : {}),
    ...(opts.from || opts.to
      ? {
          startsAt: {
            ...(opts.from ? { gte: opts.from } : {}),
            ...(opts.to ? { lte: opts.to } : {}),
          },
        }
      : {}),
  };

  const [rows, total] = await db.$transaction([
    db.shift.findMany({
      where,
      orderBy: { startsAt: "asc" },
      skip,
      take: pageSize,
      select: shiftSelect,
    }),
    db.shift.count({ where }),
  ]);

  return { rows, total };
}
