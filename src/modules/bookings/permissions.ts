export const BOOKING_PERMISSIONS = {
  VIEW: "booking.view",
  CREATE: "booking.create",
  ASSIGN: "booking.assign",
  REASSIGN: "booking.reassign",
  CANCEL: "booking.cancel",
  OVERRIDE: "booking.override",
  /** Phase 4: driver claims an OPEN_FOR_CLAIM booking */
  CLAIM: "booking.claim",
} as const;
