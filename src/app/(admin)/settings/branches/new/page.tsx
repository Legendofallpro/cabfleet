import { Metadata } from "next";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { BranchForm } from "@/modules/branches/components/BranchForm";

export const metadata: Metadata = { title: "New Branch | CabFleet Admin" };

export default function NewBranchPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="New Branch" />
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <BranchForm mode="create" />
      </div>
    </div>
  );
}
