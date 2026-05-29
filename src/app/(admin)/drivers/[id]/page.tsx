import { Metadata } from "next";
import { notFound } from "next/navigation";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { DriverEditForm } from "@/modules/drivers/components/DriverEditForm";
import { getDriver } from "@/modules/drivers/queries/driver";
import { listBranches } from "@/modules/branches/queries/branch";

export const metadata: Metadata = { title: "Edit Driver | CabFleet Admin" };

export default async function EditDriverPage({
 params,
}: {
 params: Promise<{ id: string }>;
}) {
 const { id } = await params;
 const [driver, { rows: branches }] = await Promise.all([
  getDriver(id),
  listBranches({ pageSize: 100 }),
 ]);
 if (!driver) notFound();

 return (
  <div>
   <PageBreadcrumb pageTitle={`Edit: ${driver.profile.fullName ?? driver.profile.email}`} />
   <SurfaceCard>
    <DriverEditForm
     branches={branches}
     defaultValues={{
      id: driver.id,
      fullName: driver.profile.fullName ?? "",
      phone: driver.profile.phone ?? "",
      branchId: driver.profile.branchId ?? "",
      licenseNumber: driver.licenseNumber,
      licenseExpiry: driver.licenseExpiry.toISOString().slice(0, 10),
      status: driver.status,
      verification: driver.verification,
      notes: driver.notes ?? "",
     }}
    />
   </SurfaceCard>
  </div>
 );
}
