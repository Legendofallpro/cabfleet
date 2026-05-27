"use server";

import { revalidatePath } from "next/cache";
import { action } from "@/lib/actions";
import { requirePermission, requireSession } from "@/lib/auth/requireRole";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { AppError } from "@/lib/errors";
import {
  checkIn,
  checkOut,
  markAbsent,
} from "@/modules/attendance/services/attendance.service";
import {
  checkInSchema,
  checkOutSchema,
  markAbsentSchema,
} from "@/modules/attendance/validators/attendance";

/**
 * Admin/Staff can check in any profile.
 * Drivers can only check in themselves (ATTENDANCE_SELF).
 */
export const checkInAction = action(
  "attendance.checkIn",
  checkInSchema,
  async (input) => {
    const session = await requireSession();
    const role = session.profile.role;

    if (role === "DRIVER") {
      if (!session.profile.id || input.profileId !== session.profile.id) {
        throw new AppError("FORBIDDEN", "Drivers can only check in themselves.");
      }
    } else {
      await requirePermission(PERMISSIONS.ATTENDANCE_MANAGE);
    }

    const result = await checkIn(input, { id: session.profile.id });
    revalidatePath("/attendance");
    revalidatePath("/driver/attendance");
    return result;
  },
);

/**
 * Admin/Staff can check out any profile.
 * Drivers can only check out themselves.
 */
export const checkOutAction = action(
  "attendance.checkOut",
  checkOutSchema,
  async (input) => {
    const session = await requireSession();
    const role = session.profile.role;

    if (role === "DRIVER") {
      if (!session.profile.id || input.profileId !== session.profile.id) {
        throw new AppError("FORBIDDEN", "Drivers can only check out themselves.");
      }
    } else {
      await requirePermission(PERMISSIONS.ATTENDANCE_MANAGE);
    }

    const result = await checkOut(input, { id: session.profile.id });
    revalidatePath("/attendance");
    revalidatePath("/driver/attendance");
    return result;
  },
);

/**
 * Admin/Staff only: mark a profile as absent or on leave.
 */
export const markAbsentAction = action(
  "attendance.markAbsent",
  markAbsentSchema,
  async (input) => {
    const actor = await requirePermission(PERMISSIONS.ATTENDANCE_MANAGE);
    const result = await markAbsent(input, { id: actor.profile.id });
    revalidatePath("/attendance");
    return result;
  },
);
