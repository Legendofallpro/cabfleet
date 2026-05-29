import { db } from "@/lib/db";

export type CustomerRow = {
  id: string;
  profileId: string;
  loyaltyTier: string | null;
  totalBookings: number;
  totalSpend: number;
  createdAt: Date;
};

const CUSTOMER_SELECT = {
  id: true,
  profileId: true,
  loyaltyTier: true,
  totalBookings: true,
  totalSpend: true,
  createdAt: true,
} as const;

/**
 * Returns the Customer extension record for a Profile, or creates it lazily.
 * This is a write operation (upsert) and must live in services/, not queries/.
 * Handles customers who signed up before Phase 3 (no Customer row yet).
 */
export async function getOrCreateCustomer(profileId: string): Promise<CustomerRow> {
  const existing = await db.customer.findFirst({
    where: { profileId, deletedAt: null },
    select: CUSTOMER_SELECT,
  });

  if (existing) {
    return { ...existing, totalSpend: Number(existing.totalSpend) };
  }

  const created = await db.customer.create({
    data: { profileId },
    select: CUSTOMER_SELECT,
  });

  return { ...created, totalSpend: Number(created.totalSpend) };
}
