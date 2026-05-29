import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { getSessionUser } from "@/lib/auth/session";
import { getOrg } from "@/modules/orgs/queries/org";
import { OrgForm } from "@/modules/orgs/components/OrgForm";

export const metadata: Metadata = { title: "Edit Organization | CabFleet" };
export const dynamic = "force-dynamic";

export default async function EditOrgPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSessionUser();
  if (!session || session.profile.role !== "SUPER_ADMIN") redirect("/");

  const { id } = await params;
  const org = await getOrg(id);
  if (!org) notFound();

  return (
    <div>
      <PageBreadcrumb pageTitle={`Edit ${org.name}`} />
      <SurfaceCard>
        <OrgForm
          mode="edit"
          defaultValues={{ id: org.id, slug: org.slug, name: org.name }}
        />
      </SurfaceCard>
    </div>
  );
}
