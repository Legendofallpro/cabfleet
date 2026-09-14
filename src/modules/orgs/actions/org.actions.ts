"use server";

import { revalidatePath } from "next/cache";
import { action } from "@/lib/actions";
import { requireRole } from "@/lib/auth/requireRole";
import {
  createOrgSchema,
  orgIdSchema,
  updateOrgGstSchema,
  updateOrgSchema,
} from "@/modules/orgs/validators/org";
import {
  createOrg,
  softDeleteOrg,
  updateOrg,
  updateOrgGst,
} from "@/modules/orgs/services/org.service";

/**
 * Org CRUD actions (Phase 7 W1).
 *
 * Belt-and-braces: actions gate on `requireRole([SUPER_ADMIN])` directly
 * rather than `requirePermission(ORG_MANAGE)`. The two are equivalent
 * today (only SUPER_ADMIN has ORG_MANAGE) but pinning the role here makes
 * the cross-org intent explicit at the boundary and survives any future
 * permission table reorg.
 */

export const createOrgAction = action(
  "orgs.create",
  createOrgSchema,
  async (input) => {
    const actor = await requireRole(["SUPER_ADMIN"]);
    const result = await createOrg(input, { id: actor.profile.id });
    revalidatePath("/orgs");
    return result;
  },
);

export const updateOrgAction = action(
  "orgs.update",
  updateOrgSchema,
  async ({ id, ...input }) => {
    const actor = await requireRole(["SUPER_ADMIN"]);
    const result = await updateOrg(id, input, { id: actor.profile.id });
    revalidatePath("/orgs");
    revalidatePath(`/orgs/${id}`);
    return result;
  },
);

export const deleteOrgAction = action(
  "orgs.delete",
  orgIdSchema,
  async ({ id }) => {
    const actor = await requireRole(["SUPER_ADMIN"]);
    const result = await softDeleteOrg(id, { id: actor.profile.id });
    revalidatePath("/orgs");
    return result;
  },
);

export const updateOrgGstAction = action(
  "orgs.updateGst",
  updateOrgGstSchema,
  async (input) => {
    const actor = await requireRole(["ADMIN", "SUPER_ADMIN"]);
    const result = await updateOrgGst(input, {
      id: actor.profile.id,
      role: actor.profile.role,
      orgId: actor.profile.orgId,
    });
    revalidatePath("/settings/gst");
    revalidatePath("/settings");
    return result;
  },
);
