import { Metadata } from "next";
import Link from "next/link";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { VehicleForm } from "@/modules/vehicles/components/VehicleForm";
import { listBranches } from "@/modules/branches/queries/branch";

export const metadata: Metadata = { title: "Add Vehicle | CabFleet Admin" };

export default async function NewVehiclePage() {
 const { rows: branches } = await listBranches({ pageSize: 100 });

 return (
  <div>
   <PageBreadcrumb pageTitle="Add Vehicle" />
   <SurfaceCard>
    {branches.length === 0 ? (
     <div className="rounded-lg bg-warning-50 p-4 text-sm text-warning-700 dark:bg-warning-500/10 dark:text-warning-400">
      Create a{" "}
      <Link href="/settings/branches/new" className="font-medium underline">
       branch
      </Link>{" "}
      first - every vehicle must belong to one.
     </div>
    ) : (
     <VehicleForm mode="create" branches={branches} />
    )}
   </SurfaceCard>
  </div>
 );
}
