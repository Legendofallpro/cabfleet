/**
 * Trip-completion policy (Phase 7 W5 §S7).
 *
 * `transitionBookingStatus` calls `assertCanCompleteTrip` before
 * advancing IN_PROGRESS → COMPLETED. If the booking has accumulated
 * more than env.LOCATION_SUSPICIOUS_THRESHOLD flagged points the
 * transition is refused; ops must clear the counter (admin action,
 * which writes an audit log entry) before the driver can complete.
 *
 * Set LOCATION_SUSPICIOUS_THRESHOLD=0 to disable the gate.
 */
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";

export function assertCanCompleteTrip(opts: {
  bookingId: string;
  suspiciousLocationCount: number;
}): void {
  const threshold = env.LOCATION_SUSPICIOUS_THRESHOLD;
  if (threshold === 0) return;
  if (opts.suspiciousLocationCount >= threshold) {
    throw new AppError(
      "CONFLICT",
      `This trip has ${opts.suspiciousLocationCount} flagged location points (threshold ${threshold}). An administrator must review before it can be marked complete.`,
    );
  }
}
