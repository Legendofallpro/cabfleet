import { Metadata } from "next";
import { notFound } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { BranchForm } from "@/modules/branches/components/BranchForm";
import { getBranch } from "@/modules/branches/queries/branch";

export const metadata: Metadata = { title: "Edit Branch | CabFleet Admin" };

export default async function EditBranchPage({
 params,
}: {
 params: Promise<{ id: string }>;
}) {
 const { id } = await params;
 const branch = await getBranch(id);
 if (!branch) notFound();

 return (
  <div>
   <PageBreadcrumb pageTitle={`Edit: ${branch.name}`} />
   <SurfaceCard>
    <BranchForm
     mode="edit"
     defaultValues={{
      id: branch.id,
      name: branch.name,
      code: branch.code,
      timezone: branch.timezone,
      address: branch.address ?? "",
      phone: branch.phone ?? "",
      email: branch.email ?? "",
      defaultDispatch: branch.defaultDispatch,
      active: branch.active,
     }}
    />
   </SurfaceCard>
  </div>
 );
}
