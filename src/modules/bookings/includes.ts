/**
 * Shared Prisma include clauses for the Booking model.
 * No server-only imports — safe to import from queries, services, and tests.
 */

export const bookingDetailInclude = {
  branch: { select: { id: true, name: true, code: true } },
  customer: {
    include: {
      profile: { select: { id: true, fullName: true, email: true, phone: true } },
    },
  },
  bookingType: { select: { id: true, name: true, defaultDispatchMode: true } },
  assignedDriver: {
    include: {
      profile: { select: { id: true, fullName: true, email: true, phone: true } },
    },
  },
  assignedVehicle: {
    select: { id: true, registrationNumber: true, make: true, model: true },
  },
  claimedBy: {
    include: {
      profile: { select: { id: true, fullName: true, email: true } },
    },
  },
  assignedBy: { select: { id: true, fullName: true, email: true } },
  createdBy: { select: { id: true, fullName: true, email: true } },
  assignmentHistory: {
    orderBy: { at: "desc" as const },
    include: {
      byProfile: { select: { id: true, fullName: true, email: true } },
    },
  },
} as const;

/** Open-claim list/detail: passenger name only — no email/phone. */
export const openClaimBookingInclude = {
  branch: { select: { id: true, name: true, code: true } },
  customer: {
    include: {
      profile: { select: { id: true, fullName: true } },
    },
  },
  bookingType: { select: { id: true, name: true, defaultDispatchMode: true } },
  assignedDriver: {
    include: {
      profile: { select: { id: true, fullName: true } },
    },
  },
  assignedVehicle: {
    select: { id: true, registrationNumber: true, make: true, model: true },
  },
  claimedBy: {
    include: {
      profile: { select: { id: true, fullName: true } },
    },
  },
  assignedBy: { select: { id: true, fullName: true } },
  createdBy: { select: { id: true, fullName: true } },
  assignmentHistory: {
    orderBy: { at: "desc" as const },
    include: {
      byProfile: { select: { id: true, fullName: true } },
    },
  },
} as const;
