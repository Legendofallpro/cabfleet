"use client";

import Link from "next/link";
import React, { useState } from "react";

import { cn } from "@/lib/cn";
import type { HeaderNotificationSummary } from "@/modules/notifications/queries/notification";

import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";

type Props = {
  summary: HeaderNotificationSummary;
};

const timeFmt = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
});

export default function HeaderNotificationDropdown({ summary }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  function toggleDropdown() {
    setIsOpen((prev) => !prev);
    setDismissed(true);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const showDot = summary.hasRecent && !dismissed;

  return (
    <div className="relative">
      <button
        type="button"
        className="dropdown-toggle relative flex h-11 w-11 items-center justify-center rounded-full border border-default bg-surface-elevated text-muted transition-colors hover:bg-surface-inset hover:text-default"
        onClick={toggleDropdown}
        aria-label="Notifications"
      >
        {showDot && (
          <span className="absolute right-2 top-2 z-10 h-2 w-2 rounded-full bg-warning" />
        )}
        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute right-0 mt-3 flex w-80 flex-col rounded-2xl border border-default bg-surface-elevated p-3 shadow-theme-lg"
      >
        <div className="mb-3 flex items-center justify-between border-b border-default pb-3">
          <h5 className="text-sm font-semibold text-default">Notifications</h5>
        </div>
        {summary.items.length === 0 ? (
          <p className="px-2 py-4 text-sm text-muted">No recent dispatches in the last 24 hours.</p>
        ) : (
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {summary.items.map((item) => (
              <li key={item.id}>
                <DropdownItem
                  onItemClick={closeDropdown}
                  className="flex flex-col gap-0.5 rounded-lg px-3 py-2 hover:bg-surface-inset"
                >
                  <span className="text-sm font-medium text-default">{item.title}</span>
                  <span className="flex items-center gap-2 text-xs text-muted">
                    <span>{item.subtitle}</span>
                    <span className="h-1 w-1 rounded-full bg-muted" />
                    <span>{timeFmt.format(item.createdAt)}</span>
                  </span>
                </DropdownItem>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/notifications"
          className={cn(
            "mt-3 block rounded-lg border border-default px-4 py-2 text-center text-sm font-medium text-default hover:bg-surface-inset",
            summary.items.length === 0 && "pointer-events-none opacity-50",
          )}
        >
          View all
        </Link>
      </Dropdown>
    </div>
  );
}
