import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

export type StatusTone = "neutral" | "success" | "warning" | "error" | "info";

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
  {
    variants: {
      tone: {
        neutral: "bg-surface-inset text-muted",
        success: "bg-success-subtle text-on-success-subtle",
        warning: "bg-warning-subtle text-on-warning-subtle",
        error:   "bg-error-subtle text-on-error-subtle",
        info:    "bg-primary-subtle text-on-primary-subtle",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  children: React.ReactNode;
  className?: string;
}

export function StatusBadge({ tone, children, className }: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ tone }), className)}>
      {children}
    </span>
  );
}
