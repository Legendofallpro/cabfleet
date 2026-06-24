import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SurfaceCard } from "@/components/common/SurfaceCard";
import { getSessionUser } from "@/lib/auth/session";
import { getRoleHome } from "@/lib/auth/redirects";
import { ChangePasswordForm } from "@/modules/profile/components/ChangePasswordForm";
import { LocaleForm } from "@/modules/profile/components/LocaleForm";
import { NotificationPrefsForm } from "@/modules/profile/components/NotificationPrefsForm";
import { parseNotificationPrefsFormValues } from "@/modules/profile/profile.constants";

export const metadata: Metadata = {
  title: "Account Settings | CabFleet",
};

export default async function CustomerAccountSettingsPage() {
  const session = await getSessionUser();
  if (!session) redirect("/signin?redirectTo=/portal/profile/account");
  if (session.profile.role !== "CUSTOMER") redirect(getRoleHome(session.profile.role));

  const notificationDefaults = parseNotificationPrefsFormValues(
    session.profile.notificationPrefs,
  );
  const cancelHref = "/portal/profile/account";

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-default">Account settings</h1>
        <p className="mt-1 text-sm text-muted">
          <Link href="/portal/profile" className="text-primary hover:underline">
            Back to profile
          </Link>
        </p>
      </div>

      <SurfaceCard title="Security">
        <ChangePasswordForm email={session.profile.email} cancelHref={cancelHref} />
      </SurfaceCard>

      <SurfaceCard title="Language">
        <LocaleForm defaultValues={{ locale: session.profile.locale }} cancelHref={cancelHref} />
      </SurfaceCard>

      <SurfaceCard title="Notifications">
        <NotificationPrefsForm defaultValues={notificationDefaults} cancelHref={cancelHref} />
      </SurfaceCard>
    </div>
  );
}
