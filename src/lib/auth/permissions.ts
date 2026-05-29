import type { Role } from "@prisma/client";
import { BOOKING_PERMISSIONS } from "@/modules/bookings/permissions";
import { DRIVER_PERMISSIONS } from "@/modules/drivers/permissions";
import { VEHICLE_PERMISSIONS } from "@/modules/vehicles/permissions";
import { ATTENDANCE_PERMISSIONS } from "@/modules/attendance/permissions";
import { ORG_PERMISSIONS } from "@/modules/orgs/permissions";

/**
 * Fine-grained permission strings. The convention is "<entity>.<action>".
 *
 * Per-domain groups live in src/modules/<feature>/permissions.ts and are
 * re-exported here so callers continue to use `PERMISSIONS.*` from one
 * import site. Add new domains following the same pattern.
 */
export const PERMISSIONS = {
  // Branches
  BRANCH_VIEW: "branch.view",
  BRANCH_MANAGE: "branch.manage",

  // Vehicles — defined in src/modules/vehicles/permissions.ts
  VEHICLE_VIEW: VEHICLE_PERMISSIONS.VIEW,
  VEHICLE_MANAGE: VEHICLE_PERMISSIONS.MANAGE,

  // Drivers — defined in src/modules/drivers/permissions.ts
  DRIVER_VIEW: DRIVER_PERMISSIONS.VIEW,
  DRIVER_MANAGE: DRIVER_PERMISSIONS.MANAGE,
  DRIVER_VERIFY: DRIVER_PERMISSIONS.VERIFY,

  // Staff
  STAFF_VIEW: "staff.view",
  STAFF_MANAGE: "staff.manage",

  // Customers
  CUSTOMER_VIEW: "customer.view",
  CUSTOMER_MANAGE: "customer.manage",

  // Bookings (Phase 2+) — defined in src/modules/bookings/permissions.ts
  BOOKING_VIEW: BOOKING_PERMISSIONS.VIEW,
  BOOKING_CREATE: BOOKING_PERMISSIONS.CREATE,
  BOOKING_ASSIGN: BOOKING_PERMISSIONS.ASSIGN,
  BOOKING_REASSIGN: BOOKING_PERMISSIONS.REASSIGN,
  BOOKING_CANCEL: BOOKING_PERMISSIONS.CANCEL,
  BOOKING_OVERRIDE: BOOKING_PERMISSIONS.OVERRIDE,
  BOOKING_CLAIM: BOOKING_PERMISSIONS.CLAIM,

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

  // Attendance (Phase 6) — defined in src/modules/attendance/permissions.ts
  ATTENDANCE_VIEW: ATTENDANCE_PERMISSIONS.VIEW,
  ATTENDANCE_MANAGE: ATTENDANCE_PERMISSIONS.MANAGE,
  ATTENDANCE_SELF: ATTENDANCE_PERMISSIONS.SELF,

  // Fuel (Phase 6)
  FUEL_VIEW: "fuel.view",
  FUEL_MANAGE: "fuel.manage",

  // Expenses (Phase 6)
  EXPENSE_VIEW: "expense.view",
  EXPENSE_MANAGE: "expense.manage",

  // Maintenance (Phase 6)
  MAINTENANCE_VIEW: "maintenance.view",
  MAINTENANCE_MANAGE: "maintenance.manage",

  // Shifts (Phase 6)
  SHIFT_VIEW: "shift.view",
  SHIFT_MANAGE: "shift.manage",

  // Reports (Phase 6)
  REPORT_VIEW: "report.view",

  // Audit
  AUDIT_VIEW: "audit.view",

  // Orgs (Phase 7 W1) — SUPER_ADMIN only
  ORG_VIEW: ORG_PERMISSIONS.VIEW,
  ORG_MANAGE: ORG_PERMISSIONS.MANAGE,
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

// SUPER_ADMIN-only permissions — explicitly excluded from tenant ADMIN
// (and below) so cross-org operations require the platform role. The /admin/orgs
// action layer also belt-and-braces with `requireRole([SUPER_ADMIN])`.
const SUPER_ADMIN_ONLY: Permission[] = [
  PERMISSIONS.ORG_VIEW,
  PERMISSIONS.ORG_MANAGE,
];

const ADMIN_PERMISSIONS: Permission[] = ALL_PERMISSIONS.filter(
  (p): p is Permission => !SUPER_ADMIN_ONLY.includes(p as Permission),
);

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
  PERMISSIONS.SHIFT_VIEW,
  PERMISSIONS.SHIFT_MANAGE,
  PERMISSIONS.REPORT_VIEW,
];

const DRIVER_PERMISSIONS_LIST: Permission[] = [
  PERMISSIONS.BOOKING_VIEW,
  PERMISSIONS.BOOKING_CLAIM,
  PERMISSIONS.ATTENDANCE_SELF,
];

const CUSTOMER_PERMISSIONS_LIST: Permission[] = [
  PERMISSIONS.BOOKING_VIEW,
  PERMISSIONS.BOOKING_CREATE,
];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  // SUPER_ADMIN is the cross-org platform operator (Phase 7 W1). It inherits
  // every permission so org-specific routes work when impersonating, plus
  // the SUPER_ADMIN_ONLY permissions (ORG_*) that tenant ADMIN does not get.
  SUPER_ADMIN: ALL_PERMISSIONS,
  ADMIN: ADMIN_PERMISSIONS,
  STAFF: STAFF_PERMISSIONS,
  DRIVER: DRIVER_PERMISSIONS_LIST,
  CUSTOMER: CUSTOMER_PERMISSIONS_LIST,
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
