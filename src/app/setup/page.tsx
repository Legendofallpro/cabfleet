import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { SetupWizard } from "@/modules/install/components/SetupWizard";
import { getInstallSettings, toView } from "@/modules/install/queries/install";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (!env.INSTALL_GATE) {
    return (
      <div className="flex flex-1 flex-col justify-center">
        <SetupWizard />
      </div>
    );
  }

  const settings = await getInstallSettings();
  const setupCompleted = Boolean(settings?.setupCompletedAt);
  const session = setupCompleted ? await getSessionUser() : null;
  const role = session?.profile.role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  if (setupCompleted && !isAdmin) {
    redirect("/signin");
  }

  const initialSettings =
    setupCompleted && isAdmin && settings ? toView(settings) : undefined;

  return (
    <div className="flex flex-1 flex-col justify-center">
      <SetupWizard initialSettings={initialSettings} />
    </div>
  );
}
