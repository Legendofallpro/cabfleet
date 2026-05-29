import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getRoleHome } from "@/lib/auth/redirects";

export const dynamic = "force-dynamic";

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
 const session = await getSessionUser();
 if (!session) redirect("/signin?redirectTo=/driver");
 if (session.profile.role !== "DRIVER") redirect(getRoleHome(session.profile.role));

 return (
  <div className="flex min-h-screen flex-col bg-surface">
   {/* Header */}
   <header className="sticky top-0 z-30 border-b border-default bg-surface-elevated px-4 py-3">
    <h1 className="text-lg font-semibold text-default">
     CabFleet Driver
    </h1>
   </header>

   {/* Page content — leave space for bottom nav */}
   <main className="mx-auto w-full max-w-2xl flex-1 p-4 pb-24">{children}</main>

   {/* Bottom navigation */}
   <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-default bg-surface-elevated">
    <div className="mx-auto flex max-w-2xl">
     <NavItem href="/driver/trips/open" label="Open Trips" icon={<TripIcon />} />
     <NavItem href="/driver/trips/my" label="My Trips" icon={<MyTripsIcon />} />
     <NavItem href="/driver/attendance" label="Attendance" icon={<AttendanceIcon />} />
     <NavItem href="/driver/profile" label="Profile" icon={<ProfileIcon />} />
    </div>
   </nav>
  </div>
 );
}

function NavItem({
 href,
 label,
 icon,
}: {
 href: string;
 label: string;
 icon: React.ReactNode;
}) {
 return (
  <Link
   href={href}
   className="flex flex-1 flex-col items-center gap-1 py-3 text-xs text-muted hover:text-primary"
  >
   {icon}
   {label}
  </Link>
 );
}

function TripIcon() {
 return (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
   <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
  </svg>
 );
}

function MyTripsIcon() {
 return (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
   <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
  </svg>
 );
}

function AttendanceIcon() {
 return (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
   <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
  </svg>
 );
}

function ProfileIcon() {
 return (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
   <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
  </svg>
 );
}
