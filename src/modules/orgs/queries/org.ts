/**
 * Org queries (Phase 7 W1).
 *
 * SUPER_ADMIN-only — callers MUST ensure the surrounding context is
 * `runWithoutOrg(...)` so the Prisma tenancy extension doesn't try to
 * filter the Organization table (which is itself the source of truth for
 * orgIds and isn't tenant-scoped).
 *
 * The `Organization` model is intentionally absent from
 * TENANT_SCOPED_MODELS in src/lib/org-context.ts; the extension is a no-op
 * here regardless, but using `runWithoutOrg` keeps the intent explicit and
 * lets services that DO need a cross-org query (e.g. seeding new tenant
 * data) reuse the same wrapping pattern.
 */
import { db } from "@/lib/db";
import { runWithoutOrg } from "@/lib/org-context";

export type ListOrgsParams = {
  q?: string;
  page?: number;
  pageSize?: number;
  /** Include soft-deleted rows (SUPER_ADMIN audit view). */
  includeDeleted?: boolean;
};

export async function listOrgs({
  q = "",
  page = 1,
  pageSize = 20,
  includeDeleted = false,
}: ListOrgsParams) {
  return runWithoutOrg("query:listOrgs", async () => {
    const where = {
      ...(includeDeleted ? {} : { deletedAt: null }),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { slug: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      db.organization.findMany({
        where,
        orderBy: [{ deletedAt: "asc" }, { name: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.organization.count({ where }),
    ]);

    return { rows, total };
  });
}

export function getOrg(id: string) {
  return runWithoutOrg("query:getOrg", () =>
    db.organization.findFirst({ where: { id } }),
  );
}

export function getOrgBySlug(slug: string) {
  return runWithoutOrg("query:getOrgBySlug", () =>
    db.organization.findFirst({ where: { slug } }),
  );
}
