import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { getSessionUser } from "@/lib/auth/session";
import { ChangePasswordForm } from "@/modules/profile/components/ChangePasswordForm";
import { LocaleForm } from "@/modules/profile/components/LocaleForm";
import { MfaSettingsPanel } from "@/modules/profile/components/MfaSettingsPanel";
import { NotificationPrefsForm } from "@/modules/profile/components/NotificationPrefsForm";
import { parseNotificationPrefsFormValues } from "@/modules/profile/profile.constants";

export const metadata: Metadata = {
  title: "Account Settings | CabFleet Admin",
  description: "Manage your password and notification preferences",
};

export default async function AdminAccountSettingsPage() {
  const session = await getSessionUser();
  if (!session) redirect("/signin?redirectTo=/profile/account");

  const notificationDefaults = parseNotificationPrefsFormValues(
    session.profile.notificationPrefs,
  );

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageBreadcrumb pageTitle="Account settings" />
      <p className="text-sm text-muted">
        Manage security and notification preferences for your account.{" "}
        <Link href="/profile" className="text-primary hover:underline">
          Edit profile
        </Link>
      </p>

      <SurfaceCard title="Security">
        <p className="mb-4 text-sm text-muted">
          Choose a new password for your CabFleet login. You must enter your current password
          first.
        </p>
        <ChangePasswordForm email={session.profile.email} />
      </SurfaceCard>

      <SurfaceCard title="Two-factor authentication">
        <MfaSettingsPanel />
      </SurfaceCard>

      <SurfaceCard title="Language">
        <LocaleForm defaultValues={{ locale: session.profile.locale }} />
      </SurfaceCard>

      <SurfaceCard title="Notifications">
        <p className="mb-4 text-sm text-muted">
          Control how CabFleet reaches you. Urgent alerts may bypass quiet hours.
        </p>
        <NotificationPrefsForm defaultValues={notificationDefaults} />
      </SurfaceCard>
    </div>
  );
}
