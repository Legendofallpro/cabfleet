import { Metadata } from "next";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { BranchForm } from "@/modules/branches/components/BranchForm";

export const metadata: Metadata = { title: "New Branch | CabFleet Admin" };

export default function NewBranchPage() {
 return (
  <div>
   <PageBreadcrumb pageTitle="New Branch" />
   <SurfaceCard>
    <BranchForm mode="create" />
   </SurfaceCard>
  </div>
 );
}
