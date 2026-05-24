import { Metadata } from "next";
import Link from "next/link";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { DriverInviteForm } from "@/modules/drivers/components/DriverInviteForm";
import { listBranches } from "@/modules/branches/queries/list";

export const metadata: Metadata = { title: "Invite Driver | CabFleet Admin" };

export default async function NewDriverPage() {
  const { rows: branches } = await listBranches({ pageSize: 100 });

  return (
    <div>
      <PageBreadcrumb pageTitle="Invite Driver" />
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
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
      </div>
    </div>
  );
}
