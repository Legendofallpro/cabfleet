/**
 * Organization CRUD (Phase 7 W1).
 *
 * SUPER_ADMIN-only. Every public function wraps its body in
 * `runWithoutOrg(...)` so the Prisma tenancy extension doesn't try to
 * inject `orgId` filters into queries that are themselves about orgs.
 *
 * Soft-delete: `deletedAt` is set, the slug is tombstoned so a fresh org
 * can reclaim it. Hard-delete of tenant data is out of scope here — that
 * lives in W2's DSR `eraseCustomer` cascade.
 */
import type { Organization, Role } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { ok, type Result } from "@/lib/result";
import { writeAudit } from "@/lib/audit";
import { runWithoutOrg } from "@/lib/org-context";
import { tombstoneUniqueValue } from "@/lib/soft-delete";
import type { OrgInput, UpdateOrgGstInput } from "@/modules/orgs/validators/org";

type Actor = { id: string };

export async function createOrg(
  input: OrgInput,
  actor: Actor,
): Promise<Result<Organization>> {
  return runWithoutOrg("service:createOrg", async () => {
    const existing = await db.organization.findFirst({
      where: { slug: input.slug, deletedAt: null },
    });
    if (existing) {
      throw new AppError(
        "CONFLICT",
        `Organization slug "${input.slug}" is already in use.`,
        { fieldErrors: { slug: ["Already in use"] } },
      );
    }

    const org = await db.$transaction(async (tx) => {
      const created = await tx.organization.create({
        data: { slug: input.slug, name: input.name },
      });
      await writeAudit(tx, {
        entity: "Organization",
        entityId: created.id,
        action: "CREATE",
        byProfileId: actor.id,
        diff: { after: created },
      });
      return created;
    });

    return ok(org);
  });
}

export async function updateOrg(
  id: string,
  input: OrgInput,
  actor: Actor,
): Promise<Result<Organization>> {
  return runWithoutOrg("service:updateOrg", async () => {
    const current = await db.organization.findFirst({
      where: { id, deletedAt: null },
    });
    if (!current) throw new AppError("NOT_FOUND", "Organization not found.");

    if (input.slug !== current.slug) {
      const dupe = await db.organization.findFirst({
        where: { slug: input.slug, deletedAt: null, NOT: { id } },
      });
      if (dupe) {
        throw new AppError(
          "CONFLICT",
          `Organization slug "${input.slug}" is already in use.`,
          { fieldErrors: { slug: ["Already in use"] } },
        );
      }
    }

    const org = await db.$transaction(async (tx) => {
      const updated = await tx.organization.update({
        where: { id },
        data: { slug: input.slug, name: input.name },
      });
      await writeAudit(tx, {
        entity: "Organization",
        entityId: id,
        action: "UPDATE",
        byProfileId: actor.id,
        diff: { before: current, after: updated },
      });
      return updated;
    });

    return ok(org);
  });
}

/**
 * Soft-delete an organization. Tenant rows keep their orgId (FK has
 * ON DELETE SET NULL, but a soft-delete doesn't trigger the FK; the rows
 * stay linked to the tombstoned org for forensics). Hard-delete + DSR
 * cascade is W2's `eraseCustomer`.
 */
export async function softDeleteOrg(
  id: string,
  actor: Actor,
): Promise<Result<true>> {
  return runWithoutOrg("service:softDeleteOrg", async () => {
    const current = await db.organization.findFirst({
      where: { id, deletedAt: null },
    });
    if (!current) throw new AppError("NOT_FOUND", "Organization not found.");

    // The default org seeded by prisma/seed.ts is the safety net for
    // single-tenant deployments — deleting it would break new signups.
    if (current.slug === "default") {
      throw new AppError(
        "FORBIDDEN",
        "The default organization cannot be deleted.",
      );
    }

    const tombstonedSlug = tombstoneUniqueValue(current.slug, current.id);

    await db.$transaction(async (tx) => {
      await tx.organization.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          slug: tombstonedSlug,
        },
      });
      await writeAudit(tx, {
        entity: "Organization",
        entityId: id,
        action: "DELETE",
        byProfileId: actor.id,
        diff: {
          before: { slug: current.slug, name: current.name },
          after: { slug: tombstonedSlug, deletedAt: new Date() },
        },
      });
    });

    return ok(true);
  });
}

/**
 * Tenant ADMIN (own org) and SUPER_ADMIN (any org) update GSTIN + rate.
 * Snapshotted onto invoices at issue time — editing here does not rewrite old PDFs.
 */
export async function updateOrgGst(
  input: UpdateOrgGstInput,
  actor: { id: string; role: Role; orgId: string | null },
): Promise<Result<Organization>> {
  return runWithoutOrg("service:updateOrgGst", async () => {
    if (actor.role !== "SUPER_ADMIN") {
      if (!actor.orgId || actor.orgId !== input.orgId) {
        throw new AppError(
          "FORBIDDEN",
          "You can only update GST for your own organization.",
        );
      }
    }

    const current = await db.organization.findFirst({
      where: { id: input.orgId, deletedAt: null },
    });
    if (!current) throw new AppError("NOT_FOUND", "Organization not found.");

    const gstin = input.gstin === "" ? null : input.gstin;
    const gstRate = input.gstRate;

    const org = await db.$transaction(async (tx) => {
      const updated = await tx.organization.update({
        where: { id: input.orgId },
        data: { gstin, gstRate },
      });
      await writeAudit(tx, {
        entity: "Organization",
        entityId: input.orgId,
        action: "UPDATE",
        byProfileId: actor.id,
        diff: {
          before: { gstin: current.gstin, gstRate: current.gstRate },
          after: { gstin: updated.gstin, gstRate: updated.gstRate },
        },
      });
      return updated;
    });

    return ok(org);
  });
}
