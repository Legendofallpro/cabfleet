import React from "react";
import { cn } from "@/lib/cn";

interface ComponentCardProps {
  title: string;
  children: React.ReactNode;
  /** Only layout-related classes (margins, widths) are accepted here. */
  className?: string;
  desc?: string;
}

const ComponentCard: React.FC<ComponentCardProps> = ({
  title,
  children,
  className = "",
  desc = "",
}) => {
  return (
    <div className={cn("rounded-2xl border border-default bg-surface-elevated", className)}>
      <div className="px-6 py-5">
        <h3 className="text-base font-medium text-default">{title}</h3>
        {desc && <p className="mt-1 text-sm text-muted">{desc}</p>}
      </div>
      <div className="border-t border-default p-4 sm:p-6">
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
};

export default ComponentCard;
