import { Metadata } from "next";
import { redirect } from "next/navigation";

import { SurfaceCard } from "@/components/common/SurfaceCard";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Profile | CabFleet Driver" };

export default async function DriverProfilePage() {
 const session = await getSessionUser();
 if (!session) redirect("/signin");

 return (
  <SurfaceCard title="My Profile">
   <p className="text-sm text-muted">{session.profile.fullName ?? session.profile.email}</p>
   {session.profile.email && <p className="mt-0.5 text-xs text-muted">{session.profile.email}</p>}
   {session.profile.phone && <p className="mt-0.5 text-xs text-muted">{session.profile.phone}</p>}
  </SurfaceCard>
 );
}
