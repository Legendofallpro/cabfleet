import { Metadata } from "next";
import { notFound } from "next/navigation";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { StaffEditForm } from "@/modules/staff/components/StaffEditForm";
import { getStaff } from "@/modules/staff/queries/staff";
import { listBranches } from "@/modules/branches/queries/branch";

export const metadata: Metadata = { title: "Edit Staff | CabFleet Admin" };

export default async function EditStaffPage({
 params,
}: {
 params: Promise<{ id: string }>;
}) {
 const { id } = await params;
 const [staff, { rows: branches }] = await Promise.all([
  getStaff(id),
  listBranches({ pageSize: 100 }),
 ]);
 if (!staff) notFound();

 return (
  <div>
   <PageBreadcrumb pageTitle={`Edit: ${staff.profile.fullName ?? staff.profile.email}`} />
   <SurfaceCard>
    <StaffEditForm
     branches={branches}
     defaultValues={{
      id: staff.id,
      fullName: staff.profile.fullName ?? "",
      phone: staff.profile.phone ?? "",
      branchId: staff.profile.branchId ?? "",
      employeeId: staff.employeeId,
      designation: staff.designation,
      status: staff.status,
      role: staff.profile.role === "ADMIN" ? "ADMIN" : "STAFF",
      notes: staff.notes ?? "",
     }}
    />
   </SurfaceCard>
  </div>
 );
}
