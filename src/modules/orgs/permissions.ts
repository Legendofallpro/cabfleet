/**
 * Orgs module permissions (Phase 7 W1).
 *
 * SUPER_ADMIN is the only role with these in `ROLE_PERMISSIONS` — even
 * tenant ADMINs cannot CRUD organizations from inside their own org. The
 * /admin/orgs page checks `org.manage` and the actions enforce
 * `requireRole([SUPER_ADMIN])` belt-and-braces.
 */
export const ORG_PERMISSIONS = {
  VIEW: "org.view",
  MANAGE: "org.manage",
} as const;
