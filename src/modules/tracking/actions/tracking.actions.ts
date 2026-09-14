"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { action } from "@/lib/actions";
import { requirePermission, requireRole } from "@/lib/auth/requireRole";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getDriverForProfile } from "@/modules/drivers/services/eligibility";
import { recordLocation } from "@/modules/tracking/services/recordLocation";
import { locationPointSchema } from "@/modules/tracking/validators/location";
import { clearSuspiciousCounter } from "@/modules/tracking/services/clearSuspicious";

const clearSuspiciousSchema = z.object({
  bookingId: z.string().min(1),
  // Mandatory rationale — the action exists precisely to override a
  // safety gate, so we want the "why" in the audit row.
  reason: z.string().trim().min(3, "Reason is required").max(500),
});

const recordLocationSchema = locationPointSchema.extend({
  bookingId: z.string().min(1),
});

export const recordLocationAction = action(
  "tracking.record_location",
  recordLocationSchema,
  async (input) => {
    const actor = await requireRole(["DRIVER"]);
    const driver = await getDriverForProfile(actor.profile.id);
    return recordLocation({
      bookingId: input.bookingId,
      driverId: driver.id,
      points: [
        {
          lat: input.lat,
          lng: input.lng,
          speedKph: input.speedKph,
          recordedAt: input.recordedAt,
        },
      ],
    });
  },
);

export const clearSuspiciousCounterAction = action(
  "tracking.suspicious.clear",
  clearSuspiciousSchema,
  async ({ bookingId, reason }) => {
    // BOOKING_OVERRIDE is the existing "this is a high-trust override"
    // permission and matches the semantics of bypassing a plausibility
    // gate to allow trip completion.
    const actor = await requirePermission(PERMISSIONS.BOOKING_OVERRIDE);
    const result = await clearSuspiciousCounter(bookingId, reason, {
      id: actor.profile.id,
    });
    revalidatePath(`/bookings/${bookingId}`);
    return result;
  },
);
