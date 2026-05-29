import { Metadata } from "next";
import { redirect } from "next/navigation";

import { SurfaceCard } from "@/components/common/SurfaceCard";
import { getSessionUser } from "@/lib/auth/session";
import { getRoleHome } from "@/lib/auth/redirects";
import { getOrCreateCustomer } from "@/modules/customers/services/customer.service";

export const metadata: Metadata = { title: "Profile | CabFleet" };

const dtFmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "long" });

function ProfileRow({ label, value }: { label: string; value: React.ReactNode }) {
 return (
  <div className="flex flex-col gap-0.5 py-3.5 sm:flex-row sm:items-center sm:gap-6">
   <dt className="w-36 shrink-0 text-xs font-medium text-muted">
    {label}
   </dt>
   <dd className="text-sm text-default">{value ?? "—"}</dd>
  </div>
 );
}

export default async function ProfilePage() {
 const session = await getSessionUser();
 if (!session) redirect("/signin?redirectTo=/portal/profile");

 if (session.profile.role !== "CUSTOMER") redirect(getRoleHome(session.profile.role));

 const customer = await getOrCreateCustomer(session.profile.id);

 return (
  <div className="mx-auto max-w-lg">
   <div className="mb-6">
    <h1 className="text-2xl font-bold text-default">Profile</h1>
    <p className="mt-1 text-sm text-muted">
     Your account details.
    </p>
   </div>

   <SurfaceCard>
    {/* Avatar placeholder */}
    <div className="mb-6 flex items-center gap-4">
     <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-subtle0 text-xl font-bold text-white">
      {(session.profile.fullName ?? session.profile.email)?.[0]?.toUpperCase() ?? "?"}
     </div>
     <div>
      <p className="font-semibold text-default">
       {session.profile.fullName ?? "—"}
      </p>
      <p className="text-sm text-muted">{session.profile.email}</p>
     </div>
    </div>

    <dl className="divide-y divide-default">
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
   </SurfaceCard>

   <p className="mt-4 text-xs text-center text-muted">
    To update your name or phone, please contact support.
   </p>
  </div>
 );
}
