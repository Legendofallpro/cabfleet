import { z } from "zod";
import { BookingStatus, DispatchMode } from "@prisma/client";

// ──────────────────────────────────────────────────────────────────────────────
// Create booking (staff)
// ──────────────────────────────────────────────────────────────────────────────

export const createBookingSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  customerId: z.string().min(1, "Customer is required"),
  bookingTypeId: z.string().min(1, "Booking type is required"),
  dispatchMode: z.enum(DispatchMode).default(DispatchMode.MANUAL),
  // datetime-local input sends a string; z.coerce.date() converts it
  pickupAt: z.coerce.date(),
  pickupAddress: z.string().min(1, "Pickup address is required").max(300),
  dropAddress: z.string().min(1, "Drop address is required").max(300),
  distanceKm: z.coerce.number().positive().optional().nullable(),
  passengers: z.coerce.number().int().min(1).max(60).default(1),
  notes: z.string().max(500).optional().nullable(),
});

export type CreateBookingFormValues = z.input<typeof createBookingSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

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
