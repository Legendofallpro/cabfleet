import { z } from "zod";
import { BookingStatus } from "@prisma/client";

// ──────────────────────────────────────────────────────────────────────────────
// Create booking (staff)
// ──────────────────────────────────────────────────────────────────────────────

export const createBookingSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  customerId: z.string().min(1, "Customer is required"),
  bookingTypeId: z.string().min(1, "Booking type is required"),
  // dispatchMode is now resolved server-side by resolveDispatchPolicy.
  // datetime-local input sends a string; z.coerce.date() converts it
  pickupAt: z.coerce.date(),
  pickupAddress: z.string().min(1, "Pickup address is required").max(300),
  pickupLandmark: z.string().max(200).optional().nullable(),
  dropAddress: z.string().min(1, "Drop address is required").max(300),
  dropLandmark: z.string().max(200).optional().nullable(),
  distanceKm: z.coerce.number().positive().optional().nullable(),
  passengers: z.coerce.number().int().min(1).max(60).default(1),
  notes: z.string().max(500).optional().nullable(),
  /** Staff quote; when set, stored as fareEstimate instead of the calculator. */
  quotedFare: z.coerce.number().positive().optional().nullable(),
  tollAmount: z.coerce.number().min(0).optional().nullable(),
  parkingAmount: z.coerce.number().min(0).optional().nullable(),
  /**
   * §W5 S15: explicit per-trip opt-in for live location sharing. The
   * customer's UI MUST surface this as a real checkbox, not a hidden
   * field. When true, the service stamps Booking.locationConsentAt;
   * the ingest endpoint refuses to accept points without that
   * timestamp.
   */
  locationConsent: z.coerce.boolean().default(false),
});

export type CreateBookingFormValues = z.input<typeof createBookingSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const createDeskBookingSchema = createBookingSchema
  .omit({ customerId: true })
  .extend({
    phone: z.string().min(7).max(32),
    fullName: z.string().min(1).max(120),
  });

export type CreateDeskBookingFormValues = z.input<typeof createDeskBookingSchema>;
export type CreateDeskBookingInput = z.infer<typeof createDeskBookingSchema>;

export const updatePendingBookingSchema = z.object({
  bookingId: z.string().min(1),
  pickupAt: z.coerce.date(),
  pickupAddress: z.string().min(1).max(300),
  pickupLandmark: z.string().max(200).optional().nullable(),
  dropAddress: z.string().min(1).max(300),
  dropLandmark: z.string().max(200).optional().nullable(),
  distanceKm: z.coerce.number().positive().optional().nullable(),
  passengers: z.coerce.number().int().min(1).max(60),
  notes: z.string().max(500).optional().nullable(),
  quotedFare: z.coerce.number().positive().optional().nullable(),
  tollAmount: z.coerce.number().min(0).optional().nullable(),
  parkingAmount: z.coerce.number().min(0).optional().nullable(),
});

export type UpdatePendingBookingFormValues = z.input<typeof updatePendingBookingSchema>;
export type UpdatePendingBookingInput = z.infer<typeof updatePendingBookingSchema>;

export const estimateFareSchema = z.object({
  bookingTypeId: z.string().min(1),
  branchId: z.string().min(1),
  distanceKm: z.coerce.number().positive().optional().nullable(),
});

export type EstimateFareInput = z.infer<typeof estimateFareSchema>;

// ──────────────────────────────────────────────────────────────────────────────
// Assign driver + vehicle
// ──────────────────────────────────────────────────────────────────────────────

export const assignDriverSchema = z.object({
  bookingId: z.string().min(1),
  driverId: z.string().min(1, "Driver is required"),
  vehicleId: z.string().min(1, "Vehicle is required"),
  reason: z.string().max(300).optional(),
});

export type AssignDriverFormValues = z.input<typeof assignDriverSchema>;
export type AssignDriverInput = z.infer<typeof assignDriverSchema>;

// ──────────────────────────────────────────────────────────────────────────────
// Generic status transition (staff-triggered transitions only)
// ──────────────────────────────────────────────────────────────────────────────

export const transitionSchema = z.object({
  bookingId: z.string().min(1),
  toStatus: z.enum(BookingStatus),
  reason: z.string().max(300).optional(),
});

export type TransitionInput = z.infer<typeof transitionSchema>;

// ──────────────────────────────────────────────────────────────────────────────
// Cancel booking
// ──────────────────────────────────────────────────────────────────────────────

export const cancelBookingSchema = z.object({
  bookingId: z.string().min(1),
  reason: z.string().max(300).optional(),
});

export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;

// ──────────────────────────────────────────────────────────────────────────────
// Soft-delete booking (admin only)
// ──────────────────────────────────────────────────────────────────────────────

export const softDeleteBookingSchema = z.object({
  bookingId: z.string().min(1),
});

export type SoftDeleteBookingInput = z.infer<typeof softDeleteBookingSchema>;

export const grantLocationConsentSchema = z.object({
  bookingId: z.string().min(1),
});

export type GrantLocationConsentInput = z.infer<typeof grantLocationConsentSchema>;
