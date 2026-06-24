/**
 * Pure constants for the Booking state machine.
 * No server imports — safe to import from both Server and Client Components.
 */
import type { StatusTone } from "@/components/common/StatusBadge";
import { BookingStatus, DispatchMode } from "@prisma/client";

// ──────────────────────────────────────────────────────────────────────────────
// Active / in-trip status groups
// ──────────────────────────────────────────────────────────────────────────────

/** Bookings that are live (claimed, assigned, or in progress). */
export const ACTIVE_BOOKING_STATUSES: readonly BookingStatus[] = [
  BookingStatus.CLAIMED,
  BookingStatus.ASSIGNED,
  BookingStatus.DRIVER_EN_ROUTE,
  BookingStatus.IN_PROGRESS,
] as const;

/** Bookings where the driver is actively en-route or in progress. */
export const IN_TRIP_STATUSES: readonly BookingStatus[] = [
  BookingStatus.DRIVER_EN_ROUTE,
  BookingStatus.IN_PROGRESS,
] as const;

/**
 * Statuses a driver may transition to (W4: shared by server action +
 * `/api/v1/trips/:id/transition`). Anything outside this list requires
 * staff/admin and is rejected at the action/route layer.
 */
export const DRIVER_ALLOWED_TARGETS: readonly BookingStatus[] = [
  BookingStatus.DRIVER_EN_ROUTE,
  BookingStatus.IN_PROGRESS,
  BookingStatus.COMPLETED,
  BookingStatus.NO_SHOW,
];

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

/** StatusBadge tone for each booking status. */
export const BOOKING_STATUS_TONE: Record<BookingStatus, StatusTone> = {
  PENDING: "warning",
  OPEN_FOR_CLAIM: "info",
  CLAIMED: "info",
  ASSIGNED: "info",
  DRIVER_EN_ROUTE: "info",
  IN_PROGRESS: "success",
  COMPLETED: "success",
  CANCELLED: "neutral",
  NO_SHOW: "neutral",
  FAILED: "error",
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

// ──────────────────────────────────────────────────────────────────────────────
// Driver trip-detail UI actions
// Derived from / consistent with DRIVER_ALLOWED_TARGETS.
// A unit test in booking.constants.test.ts asserts full coverage.
// ──────────────────────────────────────────────────────────────────────────────

export type DriverNextAction = {
  toStatus: BookingStatus;
  label: string;
  variant?: "primary" | "danger" | "secondary";
};

/**
 * Maps the driver's current booking status to the list of action buttons
 * shown on the trip detail page. Keep in sync with DRIVER_ALLOWED_TARGETS.
 */
export const DRIVER_NEXT_ACTIONS: Partial<Record<BookingStatus, DriverNextAction[]>> = {
  [BookingStatus.ASSIGNED]: [
    { toStatus: BookingStatus.DRIVER_EN_ROUTE, label: "I'm on my way" },
  ],
  [BookingStatus.DRIVER_EN_ROUTE]: [
    { toStatus: BookingStatus.IN_PROGRESS, label: "Start Trip" },
    { toStatus: BookingStatus.NO_SHOW, label: "Customer No-Show", variant: "danger" },
  ],
  [BookingStatus.IN_PROGRESS]: [
    { toStatus: BookingStatus.COMPLETED, label: "Complete Trip" },
  ],
};
