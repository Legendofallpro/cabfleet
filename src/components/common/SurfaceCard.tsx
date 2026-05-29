import React from "react";
import { cn } from "@/lib/cn";

interface SurfaceCardProps {
  /** Optional card heading shown in a top bar. */
  title?: React.ReactNode;
  /** Slot rendered to the right of the title (actions, badges, buttons). */
  actions?: React.ReactNode;
  /** Inner padding preset. Defaults to "md" (p-6). */
  padding?: "sm" | "md" | "lg";
  /** Additional classes on the outer wrapper. Keep to layout only. */
  className?: string;
  as?: React.ElementType;
  children: React.ReactNode;
}

const PADDING = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
} as const;

/**
 * Standard surface card used throughout the admin, driver, and customer portals.
 * Encapsulates the `rounded-2xl border border-default bg-surface-elevated` chrome
 * so feature code never touches palette classes directly.
 */
export function SurfaceCard({
  title,
  actions,
  padding = "md",
  className,
  as: Tag = "section",
  children,
}: SurfaceCardProps) {
  return (
    <Tag
      className={cn(
        "rounded-2xl border border-default bg-surface-elevated",
        PADDING[padding],
        className,
      )}
    >
      {(title ?? actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title && (
            <h3 className="text-sm font-semibold text-default">{title}</h3>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </Tag>
  );
}
