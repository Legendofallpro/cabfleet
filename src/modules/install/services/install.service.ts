import { timingSafeEqual } from "crypto";
import type { InstallSettings } from "@prisma/client";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { runWithoutOrg } from "@/lib/org-context";
import { ok, type Result } from "@/lib/result";
import type { CompleteSetupInput } from "@/modules/install/validators/setup";

type Actor = { id: string | null };

function assertSetupSecret(input: CompleteSetupInput): void {
  const secret = env.SETUP_SECRET;
  if (!secret) return;

  const provided = input.setupSecret ?? "";
  const expectedBuf = Buffer.from(secret, "utf8");
  const providedBuf = Buffer.from(provided, "utf8");

  if (
    expectedBuf.length !== providedBuf.length ||
    !timingSafeEqual(expectedBuf, providedBuf)
  ) {
    throw new AppError("FORBIDDEN", "Invalid setup secret.");
  }
}

export async function completeSetup(
  input: CompleteSetupInput,
  actor: Actor,
): Promise<Result<InstallSettings>> {
  assertSetupSecret(input);

  const existing = await db.installSettings.findUnique({ where: { id: "default" } });
  if (existing?.setupCompletedAt && actor.id === null) {
    throw new AppError("CONFLICT", "Setup already completed.");
  }

  const isFirstComplete = !existing?.setupCompletedAt;

  const row = await runWithoutOrg("install.completeSetup", async () => {
    const hqBranch = await db.branch.findFirst({
      where: { code: "HQ", deletedAt: null },
    });

    const defaultOrg = isFirstComplete
      ? await db.organization.findFirst({
          where: { slug: "default", deletedAt: null },
        })
      : null;

    return db.$transaction(async (tx) => {
      const settings = await tx.installSettings.upsert({
        where: { id: "default" },
        create: {
          id: "default",
          country: input.country,
          currency: input.currency,
          locale: input.locale,
          timezone: input.timezone,
          phoneRegion: input.phoneRegion,
          taxIdLabel: input.taxIdLabel,
          taxRate: input.taxRate,
          setupCompletedAt: new Date(),
        },
        update: {
          country: input.country,
          currency: input.currency,
          locale: input.locale,
          timezone: input.timezone,
          phoneRegion: input.phoneRegion,
          taxIdLabel: input.taxIdLabel,
          taxRate: input.taxRate,
          setupCompletedAt: new Date(),
        },
      });

      await writeAudit(tx, {
        entity: "InstallSettings",
        entityId: "default",
        action: isFirstComplete ? "CREATE" : "UPDATE",
        byProfileId: actor.id,
        diff: isFirstComplete
          ? { after: settings }
          : { before: existing, after: settings },
      });

      if (hqBranch?.code === "HQ" && hqBranch.timezone === "UTC") {
        await tx.branch.update({
          where: { id: hqBranch.id },
          data: { timezone: input.timezone },
        });
      }

      if (isFirstComplete && defaultOrg) {
        await tx.organization.update({
          where: { id: defaultOrg.id },
          data: { gstRate: input.taxRate },
        });
      }

      return settings;
    });
  });

  return ok(row);
}
