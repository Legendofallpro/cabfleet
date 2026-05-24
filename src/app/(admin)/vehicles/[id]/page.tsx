import { Metadata } from "next";
import { notFound } from "next/navigation";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { VehicleForm } from "@/modules/vehicles/components/VehicleForm";
import { getVehicle } from "@/modules/vehicles/queries/list";
import { listBranches } from "@/modules/branches/queries/list";

export const metadata: Metadata = { title: "Edit Vehicle | CabFleet Admin" };

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [vehicle, { rows: branches }] = await Promise.all([
    getVehicle(id),
    listBranches({ pageSize: 100 }),
  ]);
  if (!vehicle) notFound();

  return (
    <div>
      <PageBreadcrumb pageTitle={`Edit: ${vehicle.registrationNumber}`} />
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <VehicleForm
          mode="edit"
          branches={branches}
          defaultValues={{
            id: vehicle.id,
            branchId: vehicle.branchId,
            registrationNumber: vehicle.registrationNumber,
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            color: vehicle.color ?? "",
            type: vehicle.type,
            capacity: vehicle.capacity,
            status: vehicle.status,
            insuranceExpiry: vehicle.insuranceExpiry?.toISOString().slice(0, 10) ?? "",
            fitnessExpiry: vehicle.fitnessExpiry?.toISOString().slice(0, 10) ?? "",
            pucExpiry: vehicle.pucExpiry?.toISOString().slice(0, 10) ?? "",
            odometer: vehicle.odometer,
            notes: vehicle.notes ?? "",
          }}
        />
      </div>
    </div>
  );
}
