import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type Column<Row> = {
  header: React.ReactNode;
  cell: (row: Row) => React.ReactNode;
  className?: string;
  headerClassName?: string;
};

type Props<Row> = {
  columns: Column<Row>[];
  rows: Row[];
  empty?: React.ReactNode;
  rowKey: (row: Row) => string;
};

/**
 * Server-rendered table. Pair with DataTableToolbar (URL-state-driven search +
 * pagination) for filtering/pagination behaviour. This component is intentionally
 * dumb: it just renders the rows you give it.
 */
export function DataTable<Row>({ columns, rows, empty, rowKey }: Props<Row>) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <Table className="text-sm">
          <TableHeader className="border-b border-gray-100 dark:border-gray-800">
            <TableRow>
              {columns.map((col, i) => (
                <TableCell
                  key={i}
                  isHeader
                  className={`px-5 py-3 text-left font-medium text-gray-500 dark:text-gray-400 ${col.headerClassName ?? ""}`}
                >
                  {col.header}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  className="px-5 py-10 text-center text-gray-400 dark:text-gray-600"
                  // colSpan via inline attr workaround (table component doesn't support it)
                  {...{ colSpan: columns.length }}
                >
                  {empty ?? "No records yet."}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={rowKey(row)}
                  className="hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                >
                  {columns.map((col, i) => (
                    <TableCell
                      key={i}
                      className={`px-5 py-4 text-gray-700 dark:text-gray-300 ${col.className ?? ""}`}
                    >
                      {col.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
