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

export const metadata: Metadata = { title: "Account Settings | CabFleet Driver" };

export default async function DriverAccountSettingsPage() {
  const session = await getSessionUser();
  if (!session) redirect("/signin?redirectTo=/driver/profile/account");
  if (session.profile.role !== "DRIVER") redirect(getRoleHome(session.profile.role));

  const notificationDefaults = parseNotificationPrefsFormValues(
    session.profile.notificationPrefs,
  );
  const cancelHref = "/driver/profile/account";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-default">Account settings</h2>
        <p className="text-sm text-muted">
          <Link href="/driver/profile" className="text-primary hover:underline">
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
