import { Metadata } from "next";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { DataTable, type Column } from "@/components/common/DataTable";
import { DataTableToolbar } from "@/components/common/DataTableToolbar";
import { parsePageParams } from "@/lib/utils/page-params";
import { listCustomers } from "@/modules/customers/queries/list";

export const metadata: Metadata = { title: "Customers | CabFleet Admin" };

type RawRow = Awaited<ReturnType<typeof listCustomers>>["rows"][number];
// Serialize Decimal → number so DataTable (client component) receives plain objects.
type Row = Omit<RawRow, "totalSpend"> & { totalSpend: number };

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const columns: Column<Row>[] = [
  {
    header: "Customer",
    cell: (c) => (
      <div className="flex flex-col">
        <span className="font-medium text-gray-900 dark:text-white/90">
          {c.profile.fullName ?? c.profile.email}
        </span>
        <span className="text-xs text-gray-500">{c.profile.email}</span>
      </div>
    ),
  },
  { header: "Phone", cell: (c) => c.profile.phone ?? "—" },
  { header: "Loyalty", cell: (c) => c.loyaltyTier ?? "—" },
  { header: "Bookings", cell: (c) => c.totalBookings.toString() },
  {
    header: "Total spend",
    cell: (c) => currency.format(c.totalSpend),
  },
];

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { q, page, pageSize } = parsePageParams(await searchParams);
  const { rows: rawRows, total } = await listCustomers({ q, page, pageSize });
  const rows: Row[] = rawRows.map((c) => ({ ...c, totalSpend: Number(c.totalSpend) }));

  return (
    <div>
      <PageBreadcrumb pageTitle="Customers" />
      <div className="space-y-4">
        <DataTableToolbar
          searchPlaceholder="Search by name, email or phone..."
          total={total}
          pageSize={pageSize}
        />
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(c) => c.id}
          empty="No customers yet. Customers appear here after their first booking."
        />
      </div>
    </div>
  );
}
