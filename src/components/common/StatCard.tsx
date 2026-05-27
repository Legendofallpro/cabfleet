import React from "react";
import { cn } from "@/lib/cn";
import type { StatusTone } from "./StatusBadge";

type StatCardTone = StatusTone | "default";

const TONE_BG: Record<StatCardTone, string> = {
  default:  "bg-surface-elevated",
  neutral:  "bg-surface-inset",
  success:  "bg-success-subtle",
  warning:  "bg-warning-subtle",
  error:    "bg-error-subtle",
  info:     "bg-primary-subtle",
};

interface StatCardProps {
  label: string;
  value: string | number;
  tone?: StatCardTone;
  className?: string;
}

/**
 * Reusable summary stat tile used on dashboard/report/attendance pages.
 * Uses semantic subtle tokens — no palette classes allowed here.
 */
export function StatCard({ label, value, tone = "default", className }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-default p-5",
        TONE_BG[tone],
        className,
      )}
    >
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-default">{value}</p>
    </div>
  );
}
