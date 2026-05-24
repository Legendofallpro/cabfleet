import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Settings | CabFleet Admin",
  description: "Platform and account settings",
};

const settingsSections = [
  {
    title: "General",
    description: "Platform name, timezone, currency, and language preferences.",
  },
  {
    title: "Notifications",
    description: "Configure email and SMS alert preferences.",
  },
  {
    title: "Billing",
    description: "Manage subscription plan and payment methods.",
  },
  {
    title: "Integrations",
    description: "Connect third-party services such as maps, payments, and SMS gateways.",
  },
  {
    title: "Security",
    description: "Two-factor authentication, session management, and API keys.",
  },
];

export default function SettingsPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Settings" />
      <div className="space-y-4">
        {settingsSections.map((section) => (
          <div
            key={section.title}
            className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-6 py-5 flex items-center justify-between"
          >
            <div>
              <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                {section.title}
              </h3>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                {section.description}
              </p>
            </div>
            <span className="text-sm text-brand-500 cursor-pointer hover:underline">
              Configure
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
