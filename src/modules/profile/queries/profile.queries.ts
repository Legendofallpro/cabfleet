import { db } from "@/lib/db";

export type ProfileWithContext = {
  profileId: string;
  role: string;
  branchName: string | null;
  branchCode: string | null;
  employeeId: string | null;
  staffDesignation: string | null;
  locale: string;
};

/**
 * Read-only profile context for self-service profile pages (branch, staff row).
 */
export async function getProfileWithContext(profileId: string): Promise<ProfileWithContext | null> {
  const profile = await db.profile.findFirst({
    where: { id: profileId, deletedAt: null },
    select: {
      id: true,
      role: true,
      locale: true,
      branch: {
        where: { deletedAt: null },
        select: { name: true, code: true },
      },
      staff: {
        where: { deletedAt: null },
        select: { employeeId: true, designation: true },
      },
    },
  });

  if (!profile) return null;

  return {
    profileId: profile.id,
    role: profile.role,
    branchName: profile.branch?.name ?? null,
    branchCode: profile.branch?.code ?? null,
    employeeId: profile.staff?.employeeId ?? null,
    staffDesignation: profile.staff?.designation ?? null,
    locale: profile.locale,
  };
}
