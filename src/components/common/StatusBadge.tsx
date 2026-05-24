import React from "react";

type Tone = "neutral" | "success" | "warning" | "error" | "info";

const TONE_CLASS: Record<Tone, string> = {
  neutral:
    "bg-gray-100 text-gray-700 dark:bg-white/[0.06] dark:text-gray-300",
  success:
    "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400",
  warning:
    "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400",
  error:
    "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400",
  info:
    "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400",
};

export function StatusBadge({
  tone = "neutral",
  children,
}: {
  tone?: Tone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  );
}
