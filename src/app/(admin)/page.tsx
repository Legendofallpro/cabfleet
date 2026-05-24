import type { Metadata } from "next";
import React from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";

export const metadata: Metadata = {
  title: "Dashboard | CabFleet Admin",
  description: "CabFleet management platform overview",
};

const stats = [
  { label: "Total Bookings Today", value: "—", change: null, color: "bg-brand-50 dark:bg-brand-500/10" },
  { label: "Active Rides", value: "—", change: null, color: "bg-success-50 dark:bg-success-500/10" },
  { label: "Available Vehicles", value: "—", change: null, color: "bg-warning-50 dark:bg-warning-500/10" },
  { label: "Revenue Today", value: "—", change: null, color: "bg-brand-50 dark:bg-brand-500/10" },
  { label: "Active Drivers", value: "—", change: null, color: "bg-success-50 dark:bg-success-500/10" },
  { label: "Pending Payments", value: "—", change: null, color: "bg-error-50 dark:bg-error-500/10" },
];

const quickLinks = [
  { label: "New Booking", href: "/bookings", description: "Create a manual booking" },
  { label: "Add Vehicle", href: "/vehicles", description: "Register a new fleet vehicle" },
  { label: "Add Driver", href: "/drivers", description: "Onboard a new driver" },
  { label: "View Reports", href: "/reports", description: "Fleet analytics and insights" },
];

export default function DashboardPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Dashboard" />
      <div className="space-y-6">
        {/* KPI Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map((stat) => (
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

        <div className="grid grid-cols-12 gap-6">
          {/* Recent Activity */}
          <div className="col-span-12 xl:col-span-8">
            <ComponentCard
              title="Recent Bookings"
              desc="Latest booking activity across the fleet."
            >
              <div className="flex items-center justify-center py-16 text-gray-400 dark:text-gray-600">
                <p className="text-sm">Connect your data source to see live bookings.</p>
              </div>
            </ComponentCard>
          </div>

          {/* Quick Links */}
          <div className="col-span-12 xl:col-span-4">
            <ComponentCard title="Quick Actions">
              <div className="space-y-3">
                {quickLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="flex items-start gap-3 rounded-xl border border-gray-100 dark:border-gray-800 p-3 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {link.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {link.description}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </ComponentCard>
          </div>
        </div>
      </div>
    </div>
  );
}
