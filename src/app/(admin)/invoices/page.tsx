import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Invoices | CabFleet Admin",
  description: "View and manage invoices",
};

export default function InvoicesPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Invoices" />
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[
            { label: "Total Invoices", value: "—", color: "bg-brand-50 dark:bg-brand-500/10" },
            { label: "Paid", value: "—", color: "bg-success-50 dark:bg-success-500/10" },
            { label: "Overdue", value: "—", color: "bg-error-50 dark:bg-error-500/10" },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`rounded-2xl border border-gray-200 dark:border-gray-800 p-5 ${stat.color}`}
            >
              <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
              <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <ComponentCard
          title="Invoice List"
          desc="All invoices will appear here once connected to a data source."
        >
          <div className="flex items-center justify-center py-16 text-gray-400 dark:text-gray-600">
            <p className="text-sm">No data available — connect your invoices data source.</p>
          </div>
        </ComponentCard>
      </div>
    </div>
  );
}
