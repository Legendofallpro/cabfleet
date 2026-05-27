import type { Role } from "@prisma/client";

/**
 * Fine-grained permission strings. The convention is "<entity>.<action>".
 * Add new permissions here as features land - never inline string permissions
 * elsewhere in the codebase.
 */
export const PERMISSIONS = {
  // Branches
  BRANCH_VIEW: "branch.view",
  BRANCH_MANAGE: "branch.manage",

  // Vehicles
  VEHICLE_VIEW: "vehicle.view",
  VEHICLE_MANAGE: "vehicle.manage",

  // Drivers
  DRIVER_VIEW: "driver.view",
  DRIVER_MANAGE: "driver.manage",
  DRIVER_VERIFY: "driver.verify",

  // Staff
  STAFF_VIEW: "staff.view",
  STAFF_MANAGE: "staff.manage",

  // Customers
  CUSTOMER_VIEW: "customer.view",
  CUSTOMER_MANAGE: "customer.manage",

  // Bookings (Phase 2+)
  BOOKING_VIEW: "booking.view",
  BOOKING_CREATE: "booking.create",
  BOOKING_ASSIGN: "booking.assign",
  BOOKING_REASSIGN: "booking.reassign",
  BOOKING_CANCEL: "booking.cancel",
  BOOKING_OVERRIDE: "booking.override",
  /** Phase 4: driver claims an OPEN_FOR_CLAIM booking */
  BOOKING_CLAIM: "booking.claim",

  // Pricing
  PRICING_VIEW: "pricing.view",
  PRICING_MANAGE: "pricing.manage",

  // Dispatch
  DISPATCH_VIEW: "dispatch.view",
  DISPATCH_MANAGE: "dispatch.manage",

  // Payments (Phase 5)
  PAYMENT_VIEW: "payment.view",
  PAYMENT_MANAGE: "payment.manage",

  // Invoices (Phase 5)
  INVOICE_VIEW: "invoice.view",
  INVOICE_MANAGE: "invoice.manage",

  // Attendance (Phase 6)
  ATTENDANCE_VIEW: "attendance.view",
  ATTENDANCE_MANAGE: "attendance.manage",
  /** Driver viewing/editing their own attendance record */
  ATTENDANCE_SELF: "attendance.self",

  // Fuel (Phase 6)
  FUEL_VIEW: "fuel.view",
  FUEL_MANAGE: "fuel.manage",

  // Expenses (Phase 6)
  EXPENSE_VIEW: "expense.view",
  EXPENSE_MANAGE: "expense.manage",

  // Maintenance (Phase 6)
  MAINTENANCE_VIEW: "maintenance.view",
  MAINTENANCE_MANAGE: "maintenance.manage",

  // Reports (Phase 6)
  REPORT_VIEW: "report.view",

  // Audit
  AUDIT_VIEW: "audit.view",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

const STAFF_PERMISSIONS: Permission[] = [
  PERMISSIONS.BRANCH_VIEW,
  PERMISSIONS.VEHICLE_VIEW,
  PERMISSIONS.VEHICLE_MANAGE,
  PERMISSIONS.DRIVER_VIEW,
  PERMISSIONS.DRIVER_MANAGE,
  PERMISSIONS.STAFF_VIEW,
  PERMISSIONS.CUSTOMER_VIEW,
  PERMISSIONS.CUSTOMER_MANAGE,
  PERMISSIONS.BOOKING_VIEW,
  PERMISSIONS.BOOKING_CREATE,
  PERMISSIONS.BOOKING_ASSIGN,
  PERMISSIONS.BOOKING_REASSIGN,
  PERMISSIONS.BOOKING_CANCEL,
  PERMISSIONS.PRICING_VIEW,
  PERMISSIONS.DISPATCH_VIEW,
  PERMISSIONS.PAYMENT_VIEW,
  PERMISSIONS.PAYMENT_MANAGE,
  PERMISSIONS.INVOICE_VIEW,
  PERMISSIONS.INVOICE_MANAGE,
  PERMISSIONS.ATTENDANCE_VIEW,
  PERMISSIONS.ATTENDANCE_MANAGE,
  PERMISSIONS.FUEL_VIEW,
  PERMISSIONS.FUEL_MANAGE,
  PERMISSIONS.EXPENSE_VIEW,
  PERMISSIONS.EXPENSE_MANAGE,
  PERMISSIONS.MAINTENANCE_VIEW,
  PERMISSIONS.MAINTENANCE_MANAGE,
  PERMISSIONS.REPORT_VIEW,
];

const DRIVER_PERMISSIONS: Permission[] = [
  PERMISSIONS.BOOKING_VIEW,
  PERMISSIONS.BOOKING_CLAIM,
  PERMISSIONS.ATTENDANCE_SELF,
];

const CUSTOMER_PERMISSIONS: Permission[] = [
  PERMISSIONS.BOOKING_VIEW,
  PERMISSIONS.BOOKING_CREATE,
];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  ADMIN: ALL_PERMISSIONS,
  STAFF: STAFF_PERMISSIONS,
  DRIVER: DRIVER_PERMISSIONS,
  CUSTOMER: CUSTOMER_PERMISSIONS,
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
