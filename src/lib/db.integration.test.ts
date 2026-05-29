/**
 * Cross-org isolation integration test (Phase 7 W1).
 *
 * GATED: only runs when `INTEGRATION_TESTS=1` is set AND a real
 * `DATABASE_URL` points to a usable Postgres. CI skips this by default;
 * locally you run it via
 *   INTEGRATION_TESTS=1 npm test -- src/lib/db.integration.test.ts
 *
 * What it proves
 * --------------
 * The Prisma `$extends` query interceptor in `src/lib/db.ts` injects
 * `orgId` into reads + filtered writes + creates on tenant-scoped models.
 * This spec creates two real Organization rows, populates each with a
 * Branch, then verifies that:
 *
 *   1. `runWithOrg(orgA)` listing branches returns only orgA's row.
 *   2. `runWithOrg(orgA)` cannot update orgB's branch — updateMany
 *      reports zero affected rows.
 *   3. `runWithoutOrg()` SUPER_ADMIN context sees both rows.
 *   4. A bare `create({ data: { ... } })` under `runWithOrg(orgA)` gets
 *      `orgId: orgA` auto-injected without the caller specifying it.
 *
 * Cleanup is best-effort — all rows touched are tombstoned with a stable
 * test-prefix so a half-failed run is recoverable on the next pass.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { runWithOrg, runWithoutOrg } from "@/lib/org-context";

const RUN = process.env.INTEGRATION_TESTS === "1";
const describeIntegration = RUN ? describe : describe.skip;

const TEST_PREFIX = "__crossorg_test__";

// Random suffix per run keeps parallel CI invocations from clobbering each
// other on the same DB.
const SUFFIX = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

const orgASlug = `${TEST_PREFIX}orga_${SUFFIX}`;
const orgBSlug = `${TEST_PREFIX}orgb_${SUFFIX}`;
const branchACode = `XA${SUFFIX}`.slice(0, 16).toUpperCase();
const branchBCode = `XB${SUFFIX}`.slice(0, 16).toUpperCase();

describeIntegration("cross-org isolation (db.ts $extends interceptor)", () => {
  let orgAId = "";
  let orgBId = "";
  let branchAId = "";
  let branchBId = "";

  beforeAll(async () => {
    await runWithoutOrg("test:setup", async () => {
      const orgA = await db.organization.create({
        data: { slug: orgASlug, name: `Test Org A ${SUFFIX}` },
      });
      const orgB = await db.organization.create({
        data: { slug: orgBSlug, name: `Test Org B ${SUFFIX}` },
      });
      orgAId = orgA.id;
      orgBId = orgB.id;
    });

    await runWithOrg(orgAId, async () => {
      const b = await db.branch.create({
        data: {
          name: `Branch A ${SUFFIX}`,
          code: branchACode,
          timezone: "Asia/Kolkata",
        },
      });
      branchAId = b.id;
    });

    await runWithOrg(orgBId, async () => {
      const b = await db.branch.create({
        data: {
          name: `Branch B ${SUFFIX}`,
          code: branchBCode,
          timezone: "Asia/Kolkata",
        },
      });
      branchBId = b.id;
    });
  }, 30_000);

  afterAll(async () => {
    await runWithoutOrg("test:teardown", async () => {
      await db.branch
        .deleteMany({ where: { id: { in: [branchAId, branchBId] } } })
        .catch(() => {});
      await db.organization
        .deleteMany({ where: { id: { in: [orgAId, orgBId] } } })
        .catch(() => {});
    });
  }, 30_000);

  it("auto-injects orgId on create when none is supplied", async () => {
    await runWithOrg(orgAId, async () => {
      const fresh = await db.branch.create({
        data: {
          name: `Auto-orgId ${SUFFIX}`,
          code: `${branchACode}-X`.slice(0, 16),
          timezone: "Asia/Kolkata",
        },
      });
      expect(fresh.orgId).toBe(orgAId);
      // cleanup the auxiliary row immediately so afterAll's cascade is small.
      await runWithoutOrg("test:aux-cleanup", () =>
        db.branch.delete({ where: { id: fresh.id } }),
      );
    });
  });

  it("filters reads to the active org", async () => {
    const rowsA = await runWithOrg(orgAId, () =>
      db.branch.findMany({
        where: { code: { in: [branchACode, branchBCode] } },
        select: { id: true, orgId: true },
      }),
    );
    expect(rowsA).toHaveLength(1);
    expect(rowsA[0]!.orgId).toBe(orgAId);

    const rowsB = await runWithOrg(orgBId, () =>
      db.branch.findMany({
        where: { code: { in: [branchACode, branchBCode] } },
        select: { id: true, orgId: true },
      }),
    );
    expect(rowsB).toHaveLength(1);
    expect(rowsB[0]!.orgId).toBe(orgBId);
  });

  it("blocks cross-org updateMany", async () => {
    const result = await runWithOrg(orgAId, () =>
      db.branch.updateMany({
        where: { id: branchBId },
        data: { name: "hacked" },
      }),
    );
    expect(result.count).toBe(0);

    const stillIntact = await runWithoutOrg("test:verify", () =>
      db.branch.findUnique({ where: { id: branchBId } }),
    );
    expect(stillIntact?.name).not.toBe("hacked");
  });

  it("SUPER_ADMIN bypass sees both orgs", async () => {
    const all = await runWithoutOrg("test:super_admin", () =>
      db.branch.findMany({
        where: { code: { in: [branchACode, branchBCode] } },
        select: { orgId: true },
      }),
    );
    const orgIds = new Set(all.map((r) => r.orgId));
    expect(orgIds.has(orgAId)).toBe(true);
    expect(orgIds.has(orgBId)).toBe(true);
  });
});
