"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function BookIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4.5v15m7.5-7.5h-15"
      />
    </svg>
  );
}

function TripsIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.008v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.008v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.008v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
      />
    </svg>
  );
}

function MeIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
      />
    </svg>
  );
}

const ITEMS = [
  { href: "/portal/book", label: "Book", icon: BookIcon, match: (p: string) => p.startsWith("/portal/book") && !p.startsWith("/portal/bookings") },
  { href: "/portal/bookings", label: "My trips", icon: TripsIcon, match: (p: string) => p.startsWith("/portal/bookings") },
  { href: "/portal/profile", label: "Me", icon: MeIcon, match: (p: string) => p.startsWith("/portal/profile") },
] as const;

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof BookIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`relative flex min-h-11 flex-1 flex-col items-center justify-center gap-1 py-3 text-xs ${
        active ? "text-primary" : "text-muted hover:text-primary"
      }`}
    >
      {active && (
        <span className="absolute inset-x-0 top-0 mx-auto h-0.5 w-8 rounded-full bg-primary" />
      )}
      <Icon />
      {label}
    </Link>
  );
}

export function CustomerBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-default bg-surface-elevated sm:hidden">
      <div className="mx-auto flex max-w-lg">
        {ITEMS.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={item.match(pathname)}
          />
        ))}
      </div>
    </nav>
  );
}
