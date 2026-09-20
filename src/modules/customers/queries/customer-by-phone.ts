import { db } from "@/lib/db";
import { rawSqlOrgId } from "@/lib/org-context";
import { resolvePhoneRegion, toE164 } from "@/lib/utils/phone";
import { getInstallSettings } from "@/modules/install/queries/install";

export type CustomerPhoneHit = {
  id: string;
  staffManaged: boolean;
  profile: { fullName: string | null; email: string; phone: string | null };
};

export async function findCustomerByPhone(phone: string): Promise<CustomerPhoneHit | null> {
  const settings = await getInstallSettings();
  const parsed = toE164(phone, resolvePhoneRegion(settings?.phoneRegion));
  if (!parsed.ok) return null;

  const orgId = await rawSqlOrgId();
  const customer = await db.customer.findFirst({
    where: {
      deletedAt: null,
      ...(orgId ? { orgId } : {}),
      profile: { phone: parsed.e164, deletedAt: null },
    },
    include: {
      profile: { select: { fullName: true, email: true, phone: true } },
    },
  });

  if (!customer) return null;

  return {
    id: customer.id,
    staffManaged: customer.staffManaged,
    profile: {
      fullName: customer.profile.fullName,
      email: customer.profile.email,
      phone: customer.profile.phone,
    },
  };
}

export async function getCustomerByProfileId(profileId: string) {
  return db.customer.findFirst({
    where: { profileId, deletedAt: null },
    select: { id: true, staffManaged: true },
  });
}
