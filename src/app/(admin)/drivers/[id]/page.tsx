import { Metadata } from "next";
import { notFound } from "next/navigation";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { DriverEditForm } from "@/modules/drivers/components/DriverEditForm";
import { getDriver } from "@/modules/drivers/queries/list";
import { listBranches } from "@/modules/branches/queries/list";

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
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
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
      </div>
    </div>
  );
}
