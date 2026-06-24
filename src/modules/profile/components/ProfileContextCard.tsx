import type { ReactNode } from "react";

import { StatusBadge } from "@/components/common/StatusBadge";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import {
  PROFILE_ROLE_LABEL,
  PROFILE_ROLE_TONE,
} from "@/modules/profile/profile.role.constants";
import type { ProfileWithContext } from "@/modules/profile/queries/profile.queries";

function ContextRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-center sm:gap-6">
      <dt className="w-36 shrink-0 text-xs font-medium text-muted">{label}</dt>
      <dd className="text-sm text-default">{value ?? "—"}</dd>
    </div>
  );
}

export function ProfileContextCard({ context }: { context: ProfileWithContext }) {
  const roleLabel = PROFILE_ROLE_LABEL[context.role] ?? context.role;

  return (
    <SurfaceCard title="Account context">
      <dl className="divide-y divide-default">
        <ContextRow
          label="Role"
          value={
            <StatusBadge tone={PROFILE_ROLE_TONE[context.role] ?? "neutral"}>
              {roleLabel}
            </StatusBadge>
          }
        />
        {context.branchName && (
          <ContextRow
            label="Branch"
            value={
              context.branchCode
                ? `${context.branchName} (${context.branchCode})`
                : context.branchName
            }
          />
        )}
        {context.employeeId && (
          <ContextRow label="Employee ID" value={context.employeeId} />
        )}
        {context.staffDesignation && (
          <ContextRow
            label="Designation"
            value={context.staffDesignation.replaceAll("_", " ")}
          />
        )}
        <ContextRow label="Locale" value={context.locale} />
      </dl>
    </SurfaceCard>
  );
}
