import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Reports | CabFleet Admin",
  description: "Fleet analytics and operational reports",
};

export default function ReportsPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Reports" />
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[
            { label: "Trip Reports", color: "bg-brand-50 dark:bg-brand-500/10" },
            { label: "Revenue Reports", color: "bg-success-50 dark:bg-success-500/10" },
            { label: "Driver Performance", color: "bg-warning-50 dark:bg-warning-500/10" },
          ].map((item) => (
            <div
              key={item.label}
              className={`rounded-2xl border border-gray-200 dark:border-gray-800 p-5 cursor-pointer hover:shadow-md transition-shadow ${item.color}`}
            >
              <p className="font-medium text-gray-800 dark:text-white/90">{item.label}</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Available once data source is connected
              </p>
            </div>
          ))}
        </div>

        <ComponentCard
          title="Analytics Overview"
          desc="Charts and reports will appear here once connected to a data source."
        >
          <div className="flex items-center justify-center py-16 text-gray-400 dark:text-gray-600">
            <p className="text-sm">No data available — connect your reporting data source.</p>
          </div>
        </ComponentCard>
      </div>
    </div>
  );
}
