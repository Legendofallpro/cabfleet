import { Metadata } from "next";
import Link from "next/link";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Settings | CabFleet Admin",
  description: "Platform settings",
};

const settingsSections = [
  {
    title: "Branches",
    description: "Offices, timezone, and default dispatch.",
    href: "/settings/branches",
  },
  {
    title: "Dispatch rules",
    description: "Manual, claim, or hybrid per branch and ride type.",
    href: "/settings/dispatch",
  },
  {
    title: "Pricing",
    description: "Base fare, per km, and per minute rules.",
    href: "/settings/pricing",
  },
  {
    title: "Booking types",
    description: "Local, airport, outstation, rental, and your own types.",
    href: "/settings/booking-types",
  },
  {
    title: "GST",
    description: "GSTIN and tax rate printed on invoices.",
    href: "/settings/gst",
  },
  {
    title: "Account security",
    description: "Password and two-factor authentication.",
    href: "/profile/account",
  },
];

const installSection = {
  title: "Install",
  description: "Country, currency, timezone for this deployment.",
  href: "/setup",
};

export default async function SettingsPage() {
  const session = await getSessionUser();
  const role = session?.profile.role;
  const sections =
    role === "ADMIN" || role === "SUPER_ADMIN"
      ? [installSection, ...settingsSections]
      : settingsSections;

  return (
    <div>
      <PageBreadcrumb pageTitle="Settings" />
      <div className="space-y-4">
        {sections.map((section) => (
          <div
            key={section.title}
            className="flex items-center justify-between rounded-2xl border border-default bg-surface-elevated px-6 py-5"
          >
            <div>
              <h3 className="text-base font-medium text-default">{section.title}</h3>
              <p className="mt-0.5 text-sm text-muted">{section.description}</p>
            </div>
            <Link href={section.href} className="text-sm text-primary hover:underline">
              Open
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
