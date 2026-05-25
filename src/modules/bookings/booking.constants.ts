/**
 * Pure constants for the Booking state machine.
 * No server imports — safe to import from both Server and Client Components.
 */
import { BookingStatus, DispatchMode } from "@prisma/client";

/** Human-readable label for each status. */
export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING: "Pending",
  OPEN_FOR_CLAIM: "Open for Claim",
  CLAIMED: "Claimed",
  ASSIGNED: "Assigned",
  DRIVER_EN_ROUTE: "Driver En Route",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
  FAILED: "Failed",
};

/** Human-readable label for dispatch mode. */
export const DISPATCH_MODE_LABEL: Record<DispatchMode, string> = {
  MANUAL: "Manual",
  CLAIM: "Claim",
  HYBRID: "Hybrid",
};

/**
 * Which statuses are terminal — no further transitions allowed.
 * Must stay in sync with ALLOWED_TRANSITIONS in transitionBookingStatus.ts.
 */
const NON_TERMINAL_STATUSES = new Set<BookingStatus>([
  BookingStatus.PENDING,
  BookingStatus.OPEN_FOR_CLAIM,
  BookingStatus.CLAIMED,
  BookingStatus.ASSIGNED,
  BookingStatus.DRIVER_EN_ROUTE,
  BookingStatus.IN_PROGRESS,
]);

export function isTerminalStatus(status: BookingStatus): boolean {
  return !NON_TERMINAL_STATUSES.has(status);
}

/**
 * The subset of transitions that staff can trigger manually from the UI.
 * ASSIGNED transitions are handled by BookingAssignForm (dedicated action).
 * Phase 4: added PENDING→OPEN_FOR_CLAIM so staff can manually open a booking.
 */
export const STAFF_MANUAL_TRANSITIONS: Partial<Record<BookingStatus, BookingStatus[]>> = {
  PENDING: [BookingStatus.OPEN_FOR_CLAIM, BookingStatus.CANCELLED],
  OPEN_FOR_CLAIM: [BookingStatus.CANCELLED],
  ASSIGNED: [BookingStatus.DRIVER_EN_ROUTE, BookingStatus.CANCELLED],
  DRIVER_EN_ROUTE: [BookingStatus.IN_PROGRESS, BookingStatus.NO_SHOW],
  IN_PROGRESS: [BookingStatus.COMPLETED, BookingStatus.FAILED],
};
