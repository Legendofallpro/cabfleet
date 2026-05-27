import { Metadata } from "next";
import { notFound } from "next/navigation";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { VehicleForm } from "@/modules/vehicles/components/VehicleForm";
import { getVehicle } from "@/modules/vehicles/queries/list";
import { listBranches } from "@/modules/branches/queries/list";
import { listDrivers } from "@/modules/drivers/queries/list";
import { listFuelLogs } from "@/modules/fuel/queries/fuel";
import { listMaintenanceLogs } from "@/modules/maintenance/queries/maintenance";
import { FuelLogForm } from "@/modules/fuel/components/FuelLogForm";
import { MaintenanceLogForm } from "@/modules/maintenance/components/MaintenanceLogForm";

export const metadata: Metadata = { title: "Edit Vehicle | CabFleet Admin" };

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [vehicle, { rows: branches }, { rows: drivers }, { rows: fuelLogs }, { rows: maintenanceLogs }] =
    await Promise.all([
      getVehicle(id),
      listBranches({ pageSize: 100 }),
      listDrivers({ pageSize: 200 }),
      listFuelLogs({ vehicleId: id, pageSize: 20 }),
      listMaintenanceLogs({ vehicleId: id, pageSize: 20 }),
    ]);

  if (!vehicle) notFound();

  const driverOptions = drivers.map((d) => ({
    value: d.id,
    label: d.profile.fullName ?? d.profile.email,
  }));

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle={`Edit: ${vehicle.registrationNumber}`} />

      {/* Edit form */}
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

      {/* Fuel Logs */}
      <ComponentCard title="Fuel Logs" desc="Record fuel fill-ups for this vehicle.">
        <div className="mb-6 border-b border-gray-100 pb-6 dark:border-gray-800">
          <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
            Add Fuel Log
          </p>
          <FuelLogForm vehicleId={id} drivers={driverOptions} />
        </div>

        {fuelLogs.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">No fuel logs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Date</th>
                  <th className="py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Litres</th>
                  <th className="py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Amount</th>
                  <th className="py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Odometer</th>
                  <th className="py-2 font-medium text-gray-500 dark:text-gray-400">Driver</th>
                </tr>
              </thead>
              <tbody>
                {fuelLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-gray-100 last:border-0 dark:border-gray-800"
                  >
                    <td className="py-2 pr-4 text-gray-600 dark:text-gray-300">
                      {new Date(log.at).toLocaleDateString()}
                    </td>
                    <td className="py-2 pr-4 text-gray-800 dark:text-white/80">
                      {Number(log.litres).toFixed(2)} L
                    </td>
                    <td className="py-2 pr-4 text-gray-800 dark:text-white/80">
                      ₹{Number(log.amount).toFixed(2)}
                    </td>
                    <td className="py-2 pr-4 text-gray-600 dark:text-gray-300">
                      {log.odometer.toLocaleString()} km
                    </td>
                    <td className="py-2 text-gray-500 dark:text-gray-400">
                      {log.driver?.profile.fullName ?? log.driver?.profile.email ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ComponentCard>

      {/* Maintenance Logs */}
      <ComponentCard title="Maintenance Logs" desc="Track service and repair history.">
        <div className="mb-6 border-b border-gray-100 pb-6 dark:border-gray-800">
          <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
            Add Maintenance Log
          </p>
          <MaintenanceLogForm vehicleId={id} />
        </div>

        {maintenanceLogs.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">No maintenance records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Date</th>
                  <th className="py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Type</th>
                  <th className="py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Cost</th>
                  <th className="py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Odometer</th>
                  <th className="py-2 font-medium text-gray-500 dark:text-gray-400">Next Due</th>
                </tr>
              </thead>
              <tbody>
                {maintenanceLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-gray-100 last:border-0 dark:border-gray-800"
                  >
                    <td className="py-2 pr-4 text-gray-600 dark:text-gray-300">
                      {new Date(log.at).toLocaleDateString()}
                    </td>
                    <td className="py-2 pr-4 text-gray-800 dark:text-white/80">
                      {log.type.replace(/_/g, " ")}
                    </td>
                    <td className="py-2 pr-4 text-gray-800 dark:text-white/80">
                      ₹{Number(log.cost).toFixed(2)}
                    </td>
                    <td className="py-2 pr-4 text-gray-600 dark:text-gray-300">
                      {log.odometer.toLocaleString()} km
                    </td>
                    <td className="py-2 text-gray-500 dark:text-gray-400">
                      {log.nextDueOdometer ? `${log.nextDueOdometer.toLocaleString()} km` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ComponentCard>
    </div>
  );
}
