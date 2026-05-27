import { db } from "@/lib/db";
import type { AttendanceStatus } from "@prisma/client";

export interface ListAttendanceOpts {
  profileId?: string;
  branchId?: string;
  from?: Date;
  to?: Date;
  status?: AttendanceStatus;
  pageSize?: number;
  page?: number;
}

const attendanceSelect = {
  id: true,
  profileId: true,
  date: true,
  checkIn: true,
  checkOut: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  profile: {
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      branchId: true,
    },
  },
} as const;

export type AttendanceRow = Awaited<ReturnType<typeof listAttendance>>["rows"][number];

export async function listAttendance(opts: ListAttendanceOpts = {}) {
  const pageSize = opts.pageSize ?? 50;
  const page = opts.page ?? 1;
  const skip = (page - 1) * pageSize;

  const where = {
    ...(opts.profileId ? { profileId: opts.profileId } : {}),
    ...(opts.from || opts.to
      ? {
          date: {
            ...(opts.from ? { gte: opts.from } : {}),
            ...(opts.to ? { lte: opts.to } : {}),
          },
        }
      : {}),
    ...(opts.status ? { status: opts.status } : {}),
    ...(opts.branchId
      ? { profile: { branchId: opts.branchId } }
      : {}),
  };

  const [rows, total] = await db.$transaction([
    db.attendance.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip,
      take: pageSize,
      select: attendanceSelect,
    }),
    db.attendance.count({ where }),
  ]);

  return { rows, total };
}

export async function getAttendanceForDate(profileId: string, date: Date) {
  return db.attendance.findUnique({
    where: { profileId_date: { profileId, date } },
    select: attendanceSelect,
  });
}

export async function getAttendanceSummaryForDate(date: Date, branchId?: string) {
  const where = {
    date,
    ...(branchId ? { profile: { branchId } } : {}),
  };

  const [present, absent, halfDay, onLeave] = await db.$transaction([
    db.attendance.count({ where: { ...where, status: "PRESENT" } }),
    db.attendance.count({ where: { ...where, status: "ABSENT" } }),
    db.attendance.count({ where: { ...where, status: "HALF_DAY" } }),
    db.attendance.count({ where: { ...where, status: "ON_LEAVE" } }),
  ]);

  return { present, absent, halfDay, onLeave };
}
