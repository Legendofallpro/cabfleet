/**
 * Shared driver eligibility helpers (Phase 7 W4).
 *
 * Originally lived inside `driver-booking.actions.ts`. Lifted here so the
 * REST `/api/v1/trips/:id/claim` route can apply the same rules without
 * duplicating the (status + branch) checks. Action + REST are thin
 * adapters — eligibility belongs in the module.
 */
import { DriverStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { err, ok, type Result } from "@/lib/result";

export type EligibleDriver = {
  id: string;
  status: DriverStatus;
  profile: { branchId: string | null };
};

/** Returns the Driver row for a Profile, or throws FORBIDDEN. */
export async function getDriverForProfile(profileId: string): Promise<EligibleDriver> {
  const driver = await db.driver.findFirst({
    where: { profileId, deletedAt: null },
    select: {
      id: true,
      status: true,
      profile: { select: { branchId: true } },
    },
  });
  if (!driver) {
    throw new AppError("FORBIDDEN", "No driver profile found for this account.");
  }
  return driver;
}

/**
 * Branch + status check shared by the claim action + REST.
 *
 * Returns a Result<EligibleDriver> rather than throwing because the
 * caller usually wants to surface the rejection reason as a typed
 * Result.err to the client (action wrapper does this for free; REST
 * handler does the same via dispatchResult).
 */
export async function ensureCanClaim(
  profileId: string,
  bookingId: string,
): Promise<Result<EligibleDriver>> {
  const driver = await getDriverForProfile(profileId);

  if (
    driver.status === DriverStatus.SUSPENDED ||
    driver.status === DriverStatus.INACTIVE
  ) {
    return err({
      code: "FORBIDDEN",
      message: "Your account is not eligible to claim trips.",
    });
  }

  const booking = await db.booking.findFirst({
    where: { id: bookingId, deletedAt: null },
    select: { branchId: true },
  });
  if (!booking) {
    return err({ code: "NOT_FOUND", message: "Booking not found." });
  }
  if (driver.profile.branchId !== booking.branchId) {
    return err({
      code: "FORBIDDEN",
      message: "You can only claim trips in your assigned branch.",
    });
  }

  return ok(driver);
}
