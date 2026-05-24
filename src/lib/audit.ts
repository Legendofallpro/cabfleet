import { Prisma, type AuditAction, type PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export type AuditInput = {
  entity: string;
  entityId: string;
  action: AuditAction;
  byProfileId?: string | null;
  diff?: unknown;
  impersonatorId?: string | null;
};

/**
 * Writes a single audit row. Always called inside the same transaction that
 * performed the mutation. Pass `tx` from `db.$transaction(async (tx) => ...)`.
 */
export async function writeAudit(tx: Tx, input: AuditInput) {
  await tx.auditLog.create({
    data: {
      entity: input.entity,
      entityId: input.entityId,
      action: input.action,
      byProfileId: input.byProfileId ?? null,
      diff:
        input.diff === undefined || input.diff === null
          ? Prisma.JsonNull
          : (JSON.parse(JSON.stringify(input.diff)) as Prisma.InputJsonValue),
      impersonatorId: input.impersonatorId ?? null,
    },
  });
}

/**
 * Convenience for callers that do not need a transaction body of their own.
 * Use only for read-then-write flows that have no DB mutation besides the audit.
 */
export async function writeAuditStandalone(input: AuditInput) {
  await writeAudit(db, input);
}
