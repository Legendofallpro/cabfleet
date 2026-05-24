// Prefer importing directly from @prisma/client for model types.
// This file holds composite/helper types that don't exist in the Prisma schema.

import type { Booking, AssignmentHistory, Profile, Driver, Vehicle, Customer, BookingType, Branch } from "@prisma/client";

/** Full booking row with all relations — returned by getBooking() */
export type BookingDetail = Booking & {
  branch: Pick<Branch, "id" | "name" | "code">;
  customer: Customer & {
    profile: Pick<Profile, "id" | "fullName" | "email" | "phone">;
  };
  bookingType: Pick<BookingType, "id" | "name" | "defaultDispatchMode">;
  assignedDriver:
    | (Driver & { profile: Pick<Profile, "id" | "fullName" | "email" | "phone"> })
    | null;
  assignedVehicle: Pick<Vehicle, "id" | "registrationNumber" | "make" | "model"> | null;
  claimedBy: (Driver & { profile: Pick<Profile, "id" | "fullName" | "email"> }) | null;
  assignedBy: Pick<Profile, "id" | "fullName" | "email"> | null;
  createdBy: Pick<Profile, "id" | "fullName" | "email"> | null;
  assignmentHistory: (AssignmentHistory & {
    byProfile: Pick<Profile, "id" | "fullName" | "email"> | null;
  })[];
};

/** Row type used by the bookings list table */
export type BookingListRow = Pick<
  Booking,
  | "id"
  | "status"
  | "dispatchMode"
  | "pickupAt"
  | "pickupAddress"
  | "dropAddress"
  | "fareEstimate"
  | "passengers"
  | "createdAt"
> & {
  branch: Pick<Branch, "id" | "code">;
  customer: Customer & {
    profile: Pick<Profile, "id" | "fullName" | "email">;
  };
  bookingType: Pick<BookingType, "id" | "name">;
  assignedDriver: (Driver & { profile: Pick<Profile, "id" | "fullName"> }) | null;
};
