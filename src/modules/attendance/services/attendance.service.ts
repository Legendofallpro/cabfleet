import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { writeAudit } from "@/lib/audit";
import { ok, type Result } from "@/lib/result";
import { logger } from "@/lib/logger";
import type { Attendance } from "@prisma/client";
import type {
  CheckInInput,
  CheckOutInput,
  MarkAbsentInput,
} from "@/modules/attendance/validators/attendance";

type Actor = { id: string };

/**
 * Upserts an attendance record with a check-in time.
 * Status defaults to PRESENT on check-in.
 */
export async function checkIn(
  input: CheckInInput,
  actor: Actor,
): Promise<Result<Attendance>> {
  const profile = await db.profile.findUnique({
    where: { id: input.profileId },
    select: { id: true },
  });
  if (!profile) throw new AppError("NOT_FOUND", "Profile not found.");

  const record = await db.$transaction(async (tx) => {
    const upserted = await tx.attendance.upsert({
      where: { profileId_date: { profileId: input.profileId, date: input.date } },
      create: {
        profileId: input.profileId,
        date: input.date,
        checkIn: input.checkIn,
        status: "PRESENT",
      },
      update: {
        checkIn: input.checkIn,
        status: "PRESENT",
      },
    });

    await writeAudit(tx, {
      entity: "Attendance",
      entityId: upserted.id,
      action: "UPDATE",
      byProfileId: actor.id,
      diff: { after: { profileId: input.profileId, date: input.date, checkIn: input.checkIn } },
    });

    return upserted;
  });

  logger.info({ attendanceId: record.id, profileId: input.profileId, by: actor.id }, "attendance.checkIn");

  return ok(record);
}

/**
 * Records check-out time on an existing attendance record.
 * Determines HALF_DAY if the shift duration is short (< 4 hours).
 */
export async function checkOut(
  input: CheckOutInput,
  actor: Actor,
): Promise<Result<Attendance>> {
  const existing = await db.attendance.findUnique({
    where: { profileId_date: { profileId: input.profileId, date: input.date } },
  });
  if (!existing) {
    throw new AppError("NOT_FOUND", "No check-in record found for this date.");
  }

  const durationMs = existing.checkIn
    ? input.checkOut.getTime() - existing.checkIn.getTime()
    : 0;
  const isHalfDay = existing.checkIn !== null && durationMs < 4 * 60 * 60 * 1000;

  const record = await db.$transaction(async (tx) => {
    const updated = await tx.attendance.update({
      where: { id: existing.id },
      data: {
        checkOut: input.checkOut,
        status: isHalfDay ? "HALF_DAY" : "PRESENT",
      },
    });

    await writeAudit(tx, {
      entity: "Attendance",
      entityId: updated.id,
      action: "UPDATE",
      byProfileId: actor.id,
      diff: { after: { checkOut: input.checkOut, status: updated.status } },
    });

    return updated;
  });

  logger.info({ attendanceId: record.id, profileId: input.profileId, by: actor.id }, "attendance.checkOut");

  return ok(record);
}

/**
 * Marks a profile as ABSENT or ON_LEAVE for a date (upsert).
 */
export async function markAbsent(
  input: MarkAbsentInput,
  actor: Actor,
): Promise<Result<Attendance>> {
  const profile = await db.profile.findUnique({
    where: { id: input.profileId },
    select: { id: true },
  });
  if (!profile) throw new AppError("NOT_FOUND", "Profile not found.");

  const record = await db.$transaction(async (tx) => {
    const upserted = await tx.attendance.upsert({
      where: { profileId_date: { profileId: input.profileId, date: input.date } },
      create: {
        profileId: input.profileId,
        date: input.date,
        status: input.status,
      },
      update: {
        status: input.status,
        checkIn: null,
        checkOut: null,
      },
    });

    await writeAudit(tx, {
      entity: "Attendance",
      entityId: upserted.id,
      action: "UPDATE",
      byProfileId: actor.id,
      diff: { after: { status: input.status } },
    });

    return upserted;
  });

  logger.info({ attendanceId: record.id, profileId: input.profileId, status: input.status, by: actor.id }, "attendance.markAbsent");

  return ok(record);
}
