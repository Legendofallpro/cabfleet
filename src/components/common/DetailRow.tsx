import type { ReactNode } from "react";

interface DetailRowProps {
  label: string;
  value: ReactNode;
}

/**
 * Responsive label + value row for detail pages.
 * Stacks vertically on mobile, side-by-side on sm+.
 */
export function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-start sm:gap-4">
      <dt className="w-36 shrink-0 text-xs font-medium text-muted">{label}</dt>
      <dd className="text-sm text-default">{value ?? "—"}</dd>
    </div>
  );
}
