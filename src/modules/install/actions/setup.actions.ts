"use server";

import { revalidatePath } from "next/cache";
import { action } from "@/lib/actions";
import { getSessionUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/requireRole";
import { getInstallSettings } from "@/modules/install/queries/install";
import { completeSetup } from "@/modules/install/services/install.service";
import { completeSetupSchema } from "@/modules/install/validators/setup";

export const completeSetupAction = action(
  "install.setup",
  completeSetupSchema,
  async (input) => {
    const settings = await getInstallSettings();
    const session = await getSessionUser();

    if (settings?.setupCompletedAt) {
      const actor = await requireRole(["ADMIN", "SUPER_ADMIN"]);
      const result = await completeSetup(input, { id: actor.profile.id });
      revalidatePath("/");
      revalidatePath("/setup");
      return result;
    }

    const result = await completeSetup(input, {
      id: session?.profile.id ?? null,
    });
    revalidatePath("/");
    revalidatePath("/setup");
    return result;
  },
);
