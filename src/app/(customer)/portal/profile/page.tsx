import { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { getOrCreateCustomer } from "@/modules/customers/queries/customer";

export const metadata: Metadata = { title: "Profile | CabFleet" };

const dtFmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "long" });

function ProfileRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-3.5 sm:flex-row sm:items-center sm:gap-6">
      <dt className="w-36 shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">
        {label}
      </dt>
      <dd className="text-sm text-gray-800 dark:text-white/90">{value ?? "—"}</dd>
    </div>
  );
}

export default async function ProfilePage() {
  const session = await getSessionUser();
  if (!session) redirect("/signin?redirectTo=/portal/profile");

  if (session.profile.role !== "CUSTOMER") redirect("/portal");

  const customer = await getOrCreateCustomer(session.profile.id);

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Your account details.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Avatar placeholder */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-xl font-bold text-white">
            {(session.profile.fullName ?? session.profile.email)?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white/90">
              {session.profile.fullName ?? "—"}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{session.profile.email}</p>
          </div>
        </div>

        <dl className="divide-y divide-gray-100 dark:divide-gray-800">
          <ProfileRow label="Full name" value={session.profile.fullName} />
          <ProfileRow label="Email" value={session.profile.email} />
          <ProfileRow label="Phone" value={session.profile.phone} />
          <ProfileRow
            label="Loyalty tier"
            value={customer.loyaltyTier ?? "Standard"}
          />
          <ProfileRow
            label="Total bookings"
            value={customer.totalBookings}
          />
          <ProfileRow
            label="Member since"
            value={dtFmt.format(new Date(customer.createdAt))}
          />
        </dl>
      </div>

      <p className="mt-4 text-xs text-center text-gray-400 dark:text-gray-500">
        To update your name or phone, please contact support.
      </p>
    </div>
  );
}
