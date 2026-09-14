import { Metadata } from "next";
import { notFound } from "next/navigation";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { DriverEditForm } from "@/modules/drivers/components/DriverEditForm";
import { AssignVehicleForm } from "@/modules/drivers/components/AssignVehicleForm";
import { getDriver, getOpenVehicleAssignment } from "@/modules/drivers/queries/driver";
import { listBranches } from "@/modules/branches/queries/branch";
import { listAssignableVehicles } from "@/modules/vehicles/queries/vehicle";

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

  const branchId = driver.profile.branchId;
  const [assignment, vehicles] = await Promise.all([
    getOpenVehicleAssignment(driver.id),
    branchId
      ? listAssignableVehicles({ branchId, pageSize: 200 })
      : Promise.resolve({ rows: [] as Awaited<ReturnType<typeof listAssignableVehicles>>["rows"] }),
  ]);

  return (
    <div className="space-y-6">
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
      <SurfaceCard title={<span className="text-base font-semibold">Paired vehicle</span>}>
        {assignment ? (
          <p className="mb-4 text-sm text-default">
            {assignment.vehicle.make} {assignment.vehicle.model} · {assignment.vehicle.registrationNumber}
          </p>
        ) : (
          <p className="mb-4 text-sm text-muted">No vehicle paired.</p>
        )}
        <AssignVehicleForm
          driverId={driver.id}
          vehicles={vehicles.rows.map((v) => ({
            id: v.id,
            registrationNumber: v.registrationNumber,
            make: v.make,
            model: v.model,
          }))}
        />
      </SurfaceCard>
    </div>
  );
}
