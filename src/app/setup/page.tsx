import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { SetupWizard } from "@/modules/install/components/SetupWizard";
import { getInstallSettings } from "@/modules/install/queries/install";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (env.INSTALL_GATE) {
    const settings = await getInstallSettings();
    if (settings?.setupCompletedAt) {
      const session = await getSessionUser();
      const role = session?.profile.role;
      if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
        redirect("/signin");
      }
    }
  }

  return (
    <div className="flex min-h-[60vh] flex-col justify-center">
      <SetupWizard />
    </div>
  );
}
