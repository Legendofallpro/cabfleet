import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Attendance | CabFleet Admin",
  description: "Track driver and staff attendance",
};

export default function AttendancePage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Attendance" />
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Present Today", value: "—", color: "bg-success-50 dark:bg-success-500/10" },
            { label: "Absent", value: "—", color: "bg-error-50 dark:bg-error-500/10" },
            { label: "On Leave", value: "—", color: "bg-warning-50 dark:bg-warning-500/10" },
            { label: "Late Arrivals", value: "—", color: "bg-brand-50 dark:bg-brand-500/10" },
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
          title="Attendance Log"
          desc="Daily attendance records will appear here once connected to a data source."
        >
          <div className="flex items-center justify-center py-16 text-gray-400 dark:text-gray-600">
            <p className="text-sm">No data available — connect your attendance data source.</p>
          </div>
        </ComponentCard>
      </div>
    </div>
  );
}
