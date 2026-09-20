import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { getSessionUser } from "@/lib/auth/session";
import { getInstallSettings } from "@/modules/install/queries/install";
import { getOrg } from "@/modules/orgs/queries/org";
import { GstSettingsForm } from "@/modules/orgs/components/GstSettingsForm";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getInstallSettings();
  const isIndia = settings?.country === "IN";
  const taxIdLabel = settings?.taxIdLabel ?? "Tax ID";
  return {
    title: isIndia ? "GST | CabFleet Admin" : `${taxIdLabel} | CabFleet Admin`,
  };
}

export default async function GstSettingsPage() {
  const session = await getSessionUser();
  if (!session) redirect("/signin?redirectTo=/settings/gst");
  if (session.profile.role !== "ADMIN" && session.profile.role !== "SUPER_ADMIN") {
    redirect("/settings");
  }

  const settings = await getInstallSettings();
  const country = settings?.country ?? "";
  const isIndia = country === "IN";
  const taxIdLabel = settings?.taxIdLabel ?? "Tax ID";
  const pageTitle = isIndia ? "GST" : taxIdLabel;

  if (!session.profile.orgId) {
    return (
      <div className="space-y-6">
        <PageBreadcrumb pageTitle={pageTitle} />
        <SurfaceCard title={pageTitle}>
          <p className="text-sm text-muted">
            This account is not attached to an organization. Open Organizations
            to set {taxIdLabel} on a tenant, or sign in as a tenant admin.
          </p>
        </SurfaceCard>
      </div>
    );
  }

  const org = await getOrg(session.profile.orgId);
  if (!org || org.deletedAt) redirect("/settings");

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle={pageTitle} />
      <SurfaceCard
        title={
          <span className="text-base font-semibold">
            {isIndia ? "Invoice GST" : `Invoice ${taxIdLabel}`}
          </span>
        }
      >
        <p className="mb-4 text-sm text-muted">
          These values are copied onto each invoice when it is issued. Changing
          them does not rewrite invoices that already exist.
          {isIndia ? " SAC for passenger transport is 9964." : ""}
        </p>
        <GstSettingsForm
          orgId={org.id}
          gstin={org.gstin}
          gstRate={org.gstRate}
          country={country}
          taxIdLabel={taxIdLabel}
        />
      </SurfaceCard>
    </div>
  );
}
