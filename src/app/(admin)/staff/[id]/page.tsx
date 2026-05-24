import { Metadata } from "next";
import { notFound } from "next/navigation";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { StaffEditForm } from "@/modules/staff/components/StaffEditForm";
import { getStaff } from "@/modules/staff/queries/list";
import { listBranches } from "@/modules/branches/queries/list";

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
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
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
      </div>
    </div>
  );
}
