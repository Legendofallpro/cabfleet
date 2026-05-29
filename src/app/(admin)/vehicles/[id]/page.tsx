import { Metadata } from "next";
import { notFound } from "next/navigation";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { VehicleForm } from "@/modules/vehicles/components/VehicleForm";
import { getVehicle } from "@/modules/vehicles/queries/vehicle";
import { listBranches } from "@/modules/branches/queries/branch";
import { listDrivers } from "@/modules/drivers/queries/driver";
import { listFuelLogs } from "@/modules/fuel/queries/fuel";
import { listMaintenanceLogs } from "@/modules/maintenance/queries/maintenance";
import { listExpenses } from "@/modules/expenses/queries/expense";
import { FuelLogForm } from "@/modules/fuel/components/FuelLogForm";
import { MaintenanceLogForm } from "@/modules/maintenance/components/MaintenanceLogForm";
import { ExpenseForm } from "@/modules/expenses/components/ExpenseForm";

export const metadata: Metadata = { title: "Edit Vehicle | CabFleet Admin" };

export default async function EditVehiclePage({
 params,
}: {
 params: Promise<{ id: string }>;
}) {
 const { id } = await params;

 const [vehicle, { rows: branches }, { rows: drivers }, { rows: fuelLogs }, { rows: maintenanceLogs }, { rows: expenses }] =
  await Promise.all([
   getVehicle(id),
   listBranches({ pageSize: 100 }),
   listDrivers({ pageSize: 200 }),
   listFuelLogs({ vehicleId: id, pageSize: 20 }),
   listMaintenanceLogs({ vehicleId: id, pageSize: 20 }),
   listExpenses({ vehicleId: id, pageSize: 20 }),
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
   <SurfaceCard>
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
   </SurfaceCard>

   {/* Fuel Logs */}
   <ComponentCard title="Fuel Logs" desc="Record fuel fill-ups for this vehicle.">
    <div className="mb-6 border-b border-default pb-6 ">
     <p className="mb-3 text-sm font-medium text-default">
      Add Fuel Log
     </p>
     <FuelLogForm vehicleId={id} drivers={driverOptions} />
    </div>

    {fuelLogs.length === 0 ? (
     <p className="py-6 text-center text-sm text-muted">No fuel logs yet.</p>
    ) : (
     <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
       <thead>
        <tr className="border-b border-default">
         <th className="py-2 pr-4 font-medium text-muted">Date</th>
         <th className="py-2 pr-4 font-medium text-muted">Litres</th>
         <th className="py-2 pr-4 font-medium text-muted">Amount</th>
         <th className="py-2 pr-4 font-medium text-muted">Odometer</th>
         <th className="py-2 font-medium text-muted">Driver</th>
        </tr>
       </thead>
       <tbody>
        {fuelLogs.map((log) => (
         <tr
          key={log.id}
          className="border-b border-default last:border-0 "
         >
          <td className="py-2 pr-4 text-muted">
           {new Date(log.at).toLocaleDateString()}
          </td>
          <td className="py-2 pr-4 text-default/80">
           {Number(log.litres).toFixed(2)} L
          </td>
          <td className="py-2 pr-4 text-default/80">
           ₹{Number(log.amount).toFixed(2)}
          </td>
          <td className="py-2 pr-4 text-muted">
           {log.odometer.toLocaleString()} km
          </td>
          <td className="py-2 text-muted">
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
    <div className="mb-6 border-b border-default pb-6 ">
     <p className="mb-3 text-sm font-medium text-default">
      Add Maintenance Log
     </p>
     <MaintenanceLogForm vehicleId={id} />
    </div>

    {maintenanceLogs.length === 0 ? (
     <p className="py-6 text-center text-sm text-muted">No maintenance records yet.</p>
    ) : (
     <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
       <thead>
        <tr className="border-b border-default">
         <th className="py-2 pr-4 font-medium text-muted">Date</th>
         <th className="py-2 pr-4 font-medium text-muted">Type</th>
         <th className="py-2 pr-4 font-medium text-muted">Cost</th>
         <th className="py-2 pr-4 font-medium text-muted">Odometer</th>
         <th className="py-2 font-medium text-muted">Next Due</th>
        </tr>
       </thead>
       <tbody>
        {maintenanceLogs.map((log) => (
         <tr
          key={log.id}
          className="border-b border-default last:border-0 "
         >
          <td className="py-2 pr-4 text-muted">
           {new Date(log.at).toLocaleDateString()}
          </td>
          <td className="py-2 pr-4 text-default/80">
           {log.type.replace(/_/g, " ")}
          </td>
          <td className="py-2 pr-4 text-default/80">
           ₹{Number(log.cost).toFixed(2)}
          </td>
          <td className="py-2 pr-4 text-muted">
           {log.odometer.toLocaleString()} km
          </td>
          <td className="py-2 text-muted">
           {log.nextDueOdometer ? `${log.nextDueOdometer.toLocaleString()} km` : "—"}
          </td>
         </tr>
        ))}
       </tbody>
      </table>
     </div>
    )}
   </ComponentCard>

   {/* Expenses */}
   <ComponentCard title="Expenses" desc="Operational expenses linked to this vehicle.">
    <div className="mb-6 border-b border-default pb-6">
     <p className="mb-3 text-sm font-medium text-default">Add Expense</p>
     <ExpenseForm vehicleId={id} />
    </div>

    {expenses.length === 0 ? (
     <p className="py-6 text-center text-sm text-muted">No expenses recorded yet.</p>
    ) : (
     <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
       <thead>
        <tr className="border-b border-default">
         <th className="py-2 pr-4 font-medium text-muted">Date</th>
         <th className="py-2 pr-4 font-medium text-muted">Category</th>
         <th className="py-2 pr-4 font-medium text-muted">Amount</th>
         <th className="py-2 font-medium text-muted">Notes</th>
        </tr>
       </thead>
       <tbody>
        {expenses.map((exp) => (
         <tr key={exp.id} className="border-b border-default last:border-0">
          <td className="py-2 pr-4 text-muted">
           {new Date(exp.at).toLocaleDateString()}
          </td>
          <td className="py-2 pr-4 text-default">{exp.category.replace(/_/g, " ")}</td>
          <td className="py-2 pr-4 font-medium text-on-error-subtle">
           ₹{Number(exp.amount).toFixed(2)}
          </td>
          <td className="max-w-xs truncate py-2 text-muted">{exp.notes ?? "—"}</td>
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
