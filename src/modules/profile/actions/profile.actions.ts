"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";

import { action } from "@/lib/actions";
import { requireRole } from "@/lib/auth/requireRole";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
  updateNotificationPrefsSchema,
  updateProfileSchema,
} from "@/modules/profile/validators/profile";
import {
  updateNotificationPrefs,
  updateProfile,
} from "@/modules/profile/services/profile.service";

const ADMIN_ROLES = [Role.ADMIN, Role.STAFF, Role.SUPER_ADMIN] as const;

export const updateProfileAction = action(
  "profile.update",
  updateProfileSchema,
  async (input) => {
    const actor = await requireRole([...ADMIN_ROLES]);
    const result = await updateProfile(input, { id: actor.profile.id });

    if (result.ok) {
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

    revalidatePath("/profile");
    revalidatePath("/");
    return result;
  },
);

export const updateNotificationPrefsAction = action(
  "profile.updateNotificationPrefs",
  updateNotificationPrefsSchema,
  async (input) => {
    const actor = await requireRole([...ADMIN_ROLES]);
    const result = await updateNotificationPrefs(input, { id: actor.profile.id });
    revalidatePath("/profile/account");
    return result;
  },
);
