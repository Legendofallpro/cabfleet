import { Metadata } from "next";
import Link from "next/link";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { DriverInviteForm } from "@/modules/drivers/components/DriverInviteForm";
import { listBranches } from "@/modules/branches/queries/branch";

export const metadata: Metadata = { title: "Invite Driver | CabFleet Admin" };

export default async function NewDriverPage() {
 const { rows: branches } = await listBranches({ pageSize: 100 });

 return (
  <div>
   <PageBreadcrumb pageTitle="Invite Driver" />
   <SurfaceCard>
    {branches.length === 0 ? (
     <div className="rounded-lg bg-warning-50 p-4 text-sm text-warning-700 dark:bg-warning-500/10 dark:text-warning-400">
      Create a{" "}
      <Link href="/settings/branches/new" className="font-medium underline">
       branch
      </Link>{" "}
      first.
     </div>
    ) : (
     <DriverInviteForm branches={branches} />
    )}
   </SurfaceCard>
  </div>
 );
}
