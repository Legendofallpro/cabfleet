import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { getSessionUser } from "@/lib/auth/session";
import { OrgForm } from "@/modules/orgs/components/OrgForm";

export const metadata: Metadata = { title: "New Organization | CabFleet" };
export const dynamic = "force-dynamic";

export default async function NewOrgPage() {
  const session = await getSessionUser();
  if (!session || session.profile.role !== "SUPER_ADMIN") redirect("/dashboard");

  return (
    <div>
      <PageBreadcrumb pageTitle="New Organization" />
      <SurfaceCard>
        <OrgForm mode="create" />
      </SurfaceCard>
    </div>
  );
}
