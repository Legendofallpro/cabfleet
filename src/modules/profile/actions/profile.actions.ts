"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { z } from "zod";

import { action } from "@/lib/actions";
import { ok } from "@/lib/result";
import { writeAuditStandalone } from "@/lib/audit";
import { requireRole } from "@/lib/auth/requireRole";
import { env } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
  updateAvatarUrlSchema,
  updateLocaleSchema,
  updateNotificationPrefsSchema,
  updateProfileSchema,
} from "@/modules/profile/validators/profile";
import {
  updateAvatarUrl,
  updateLocale,
  updateNotificationPrefs,
  updateProfile,
} from "@/modules/profile/services/profile.service";
import { ensureAvatarsBucket } from "@/modules/profile/services/avatar-storage.service";
import { assertAvatarUrlForProfile } from "@/modules/profile/avatar-url";

/** Roles that may use self-service profile mutations. */
const SELF_SERVICE_ROLES = [
  Role.SUPER_ADMIN,
  Role.ADMIN,
  Role.STAFF,
  Role.CUSTOMER,
  Role.DRIVER,
] as const;

const mfaAuditSchema = z.object({
  event: z.enum(["MFA_ENROLL", "MFA_UNENROLL", "MFA_VERIFY"]),
  factorId: z.string().optional(),
});

function revalidateProfilePaths() {
  revalidatePath("/profile");
  revalidatePath("/profile/account");
  revalidatePath("/portal/profile");
  revalidatePath("/portal/profile/account");
  revalidatePath("/driver/profile");
  revalidatePath("/driver/profile/account");
  revalidatePath("/");
}

export const updateProfileAction = action(
  "profile.update",
  updateProfileSchema,
  async (input) => {
    const actor = await requireRole([...SELF_SERVICE_ROLES]);
    const result = await updateProfile(input, { id: actor.profile.id });

    if (result.ok && actor.profile.role !== Role.CUSTOMER && actor.profile.role !== Role.DRIVER) {
      try {
        const supabase = await getSupabaseServerClient();
        await supabase.auth.updateUser({
          data: {
            full_name: input.fullName.trim(),
            phone: input.phone?.trim() || null,
          },
        });
      } catch (err) {
        logger.warn({ err }, "profile.update: auth metadata sync failed");
      }
    }

    revalidateProfilePaths();
    return result;
  },
);

export const updateNotificationPrefsAction = action(
  "profile.updateNotificationPrefs",
  updateNotificationPrefsSchema,
  async (input) => {
    const actor = await requireRole([...SELF_SERVICE_ROLES]);
    const result = await updateNotificationPrefs(input, { id: actor.profile.id });
    revalidateProfilePaths();
    return result;
  },
);

export const updateLocaleAction = action(
  "profile.updateLocale",
  updateLocaleSchema,
  async (input) => {
    const actor = await requireRole([...SELF_SERVICE_ROLES]);
    const result = await updateLocale(input, { id: actor.profile.id });
    revalidateProfilePaths();
    return result;
  },
);

export const updateAvatarUrlAction = action(
  "profile.updateAvatarUrl",
  updateAvatarUrlSchema,
  async (input) => {
    const actor = await requireRole([...SELF_SERVICE_ROLES]);

    assertAvatarUrlForProfile(
      input.avatarUrl,
      env.NEXT_PUBLIC_SUPABASE_URL,
      actor.profile.id,
    );

    const result = await updateAvatarUrl(input.avatarUrl, { id: actor.profile.id });
    revalidateProfilePaths();
    return result;
  },
);

/** Dev/ops helper: create avatars bucket if missing (ADMIN+ only). */
export const ensureAvatarsBucketAction = action(
  "profile.ensureAvatarsBucket",
  z.object({}),
  async () => {
    await requireRole([Role.SUPER_ADMIN]);
    const result = await ensureAvatarsBucket();
    return ok(result);
  },
);

export const recordMfaAuditAction = action(
  "profile.mfaAudit",
  mfaAuditSchema,
  async (input) => {
    const actor = await requireRole([...SELF_SERVICE_ROLES], { allowAal1: true });
    await writeAuditStandalone({
      entity: "Profile",
      entityId: actor.profile.id,
      action: "UPDATE",
      byProfileId: actor.profile.id,
      diff: { mfaEvent: input.event, factorId: input.factorId ?? null },
    });
    return ok(null);
  },
);
