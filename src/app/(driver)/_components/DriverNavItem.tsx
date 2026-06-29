"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface DriverNavItemProps {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export function DriverNavItem({ href, label, icon }: DriverNavItemProps) {
  const pathname = usePathname();
  const isActive = href === "/driver" ? pathname === "/driver" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`relative flex flex-1 flex-col items-center gap-1 py-3 text-xs transition ${
        isActive ? "text-primary" : "text-muted hover:text-primary"
      }`}
    >
      {isActive && (
        <span className="absolute inset-x-0 top-0 mx-auto h-0.5 w-8 rounded-full bg-primary" />
      )}
      {icon}
      {label}
    </Link>
  );
}
