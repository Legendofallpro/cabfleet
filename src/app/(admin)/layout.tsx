import { redirect } from "next/navigation";
import React from "react";

import { getSessionUser } from "@/lib/auth/session";
import { getRoleHome } from "@/lib/auth/redirects";
import AdminShell from "@/app/(admin)/_components/AdminShell";
import type { HeaderUser } from "@/layout/header-user";
import { getHeaderNotificationSummary } from "@/modules/notifications/queries/notification";

// Every page under (admin) reads the session + queries the DB, so prerendering
// makes no sense. Force dynamic at the segment root.
export const dynamic = "force-dynamic";

/**
 * Admin route group gate. Only ADMIN and STAFF can render anything under
 * `(admin)`. Drivers are redirected to /driver, customers to /portal.
 */
export default async function AdminLayout({
 children,
}: {
 children: React.ReactNode;
}) {
 const session = await getSessionUser();
 if (!session) redirect("/signin?redirectTo=/");

 switch (session.profile.role) {
  case "SUPER_ADMIN":
  case "ADMIN":
  case "STAFF": {
   const headerUser: HeaderUser = {
    fullName: session.profile.fullName,
    email: session.profile.email,
    avatarUrl: session.profile.avatarUrl,
   };
   const notifications = await getHeaderNotificationSummary(session.profile.orgId);
   return (
    <AdminShell user={headerUser} notifications={notifications}>
     {children}
    </AdminShell>
   );
  }
  case "DRIVER":
   redirect(getRoleHome(session.profile.role));
  case "CUSTOMER":
   redirect(getRoleHome(session.profile.role));
  default:
   redirect("/signin");
 }
}
