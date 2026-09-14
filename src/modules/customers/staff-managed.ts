/**
 * Staff-managed (desk) customers use a non-deliverable email so Auth still
 * has a unique address without inviting the guest to /portal.
 */
export const STAFF_MANAGED_EMAIL_DOMAIN = "staff.cabfleet.invalid";

export function isStaffManagedEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${STAFF_MANAGED_EMAIL_DOMAIN}`);
}

export function staffManagedEmailFromE164(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  return `${digits}@${STAFF_MANAGED_EMAIL_DOMAIN}`;
}
