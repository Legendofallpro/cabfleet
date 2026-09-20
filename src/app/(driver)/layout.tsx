import React from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getRoleHome } from "@/lib/auth/redirects";
import { isInstallGateEnabled } from "@/lib/env";
import { getInstallSettings } from "@/modules/install/queries/install";
import { DriverShell } from "./_components/DriverShell";

export const dynamic = "force-dynamic";

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUser();
  if (!session) redirect("/signin?redirectTo=/driver");
  if (session.profile.role !== "DRIVER") redirect(getRoleHome(session.profile.role));

  if (isInstallGateEnabled()) {
    const settings = await getInstallSettings();
    if (!settings?.setupCompletedAt) redirect("/setup");
  }

  return <DriverShell>{children}</DriverShell>;
}
