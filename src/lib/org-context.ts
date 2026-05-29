/**
 * Async-local org context (Phase 7 W1).
 *
 * Every server action wraps its body with `runWithOrg(orgId, fn)` (or
 * `runWithoutOrg(fn)` for SUPER_ADMIN cross-org operations) — the Prisma
 * extension in `src/lib/db.ts` reads the active context to inject `orgId`
 * filters into reads of tenant-scoped models and to default `orgId` on
 * writes that don't supply one explicitly.
 *
 * The context is intentionally implicit (AsyncLocalStorage rather than an
 * explicit parameter) so the Phase 0–6 service surface needs minimal
 * rewriting. Services that explicitly want cross-org behaviour (e.g.
 * Organization CRUD) call `runWithoutOrg` to opt out.
 */
import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Tenant-scoped model names — must match the Prisma model names exactly
 * (NOT the table names; the Prisma extension keys off the model name).
 *
 * Profile is intentionally excluded: SUPER_ADMIN rows carry `orgId IS NULL`
 * and the existing `findUnique({ where: { id } })` lookup paths must keep
 * working. Profile access is filtered at the call-site via `requireRole` +
 * `requireOrg` instead.
 */
export const TENANT_SCOPED_MODELS = new Set<string>([
  "Branch",
  "Driver",
  "Staff",
  "Customer",
  "Vehicle",
  "VehicleAssignment",
  "BookingType",
  "Booking",
  "PricingRule",
  "DispatchRule",
  "Payment",
  "Refund",
  "Invoice",
  "Shift",
  "Attendance",
  "FuelLog",
  "Expense",
  "MaintenanceLog",
  "AssignmentHistory",
  "AuditLog",
]);

export type OrgContext =
  | { mode: "ORG"; orgId: string }
  | { mode: "BYPASS"; reason: string };

const storage = new AsyncLocalStorage<OrgContext>();

export function getOrgContext(): OrgContext | undefined {
  return storage.getStore();
}

/** Current org id, or `null` when the active context bypasses tenancy. */
export function currentOrgId(): string | null {
  const ctx = storage.getStore();
  if (!ctx) return null;
  if (ctx.mode === "BYPASS") return null;
  return ctx.orgId;
}

/**
 * Run `fn` with `orgId` bound as the active tenant. All Prisma calls inside
 * `fn` against tenant-scoped models are filtered by this `orgId`.
 */
export function runWithOrg<T>(orgId: string, fn: () => Promise<T>): Promise<T> {
  return storage.run({ mode: "ORG", orgId }, fn);
}

/**
 * Run `fn` with tenancy filtering disabled. Reserved for SUPER_ADMIN flows
 * (Organization CRUD, cross-org migrations, system crons). `reason` is
 * required and is logged when the bypass executes a tenant-scoped write.
 */
export function runWithoutOrg<T>(reason: string, fn: () => Promise<T>): Promise<T> {
  return storage.run({ mode: "BYPASS", reason }, fn);
}
