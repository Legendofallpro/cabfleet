import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";
import { env } from "@/lib/env";
import {
  getOrgContext,
  TENANT_SCOPED_MODELS,
} from "@/lib/org-context";

declare global {
  var prismaClient: PrismaClient | undefined;
}

/**
 * Operations whose `where` filter must include `orgId` when an org context is
 * active. Read-paths only — writes are handled separately because they need
 * to *set* orgId on create instead of filtering.
 */
const READ_OPS = new Set<string>([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);

/**
 * Operations whose `where` clause we filter on tenant-scoped models. Includes
 * mutating-by-filter operations (update/delete-many) so a non-SUPER_ADMIN
 * caller can never sweep rows belonging to another org.
 */
const FILTERED_WRITE_OPS = new Set<string>([
  "update",
  "updateMany",
  "delete",
  "deleteMany",
  "findUniqueOrThrow",
]);

const CREATE_OPS = new Set<string>(["create", "createMany"]);
const UPSERT_OP = "upsert";

type AnyArgs = Record<string, unknown>;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Inject `{ orgId }` into a Prisma `where` filter, preserving any existing
 * conditions. If the where already pins an explicit `orgId` we leave it
 * untouched (caller is being explicit, e.g. for cross-org reporting under
 * `runWithoutOrg`).
 */
function injectOrgWhere(where: unknown, orgId: string): Record<string, unknown> {
  if (!isObject(where)) return { orgId };
  if (Object.prototype.hasOwnProperty.call(where, "orgId")) return where;
  return { ...where, orgId };
}

function injectOrgData(
  data: unknown,
  orgId: string,
): Record<string, unknown> | unknown[] {
  if (Array.isArray(data)) {
    return data.map((item) =>
      isObject(item) && !("orgId" in item) ? { ...item, orgId } : item,
    );
  }
  if (!isObject(data)) return { orgId };
  if ("orgId" in data) return data;
  return { ...data, orgId };
}

function applyOrgFilter(model: string, op: string, args: AnyArgs): AnyArgs {
  if (!TENANT_SCOPED_MODELS.has(model)) return args;
  const ctx = getOrgContext();
  // No context active → preserve Phase 0–6 behaviour (no filter injection).
  // BYPASS mode → SUPER_ADMIN cross-org operations.
  // Application code that needs hard tenant isolation MUST run under
  // `runWithOrg(...)`; the `withOrgContext` wrapper in `src/lib/actions.ts`
  // takes care of this for every server action.
  if (!ctx || ctx.mode === "BYPASS") return args;
  const orgId = ctx.orgId;

  if (READ_OPS.has(op) || FILTERED_WRITE_OPS.has(op)) {
    return {
      ...args,
      where: injectOrgWhere(args.where, orgId),
    };
  }

  if (CREATE_OPS.has(op)) {
    if (!("data" in args)) return args;
    return {
      ...args,
      data: injectOrgData(args.data, orgId),
    };
  }

  if (op === UPSERT_OP) {
    return {
      ...args,
      where: injectOrgWhere(args.where, orgId),
      create:
        isObject(args.create) && !("orgId" in args.create)
          ? { ...args.create, orgId }
          : args.create,
    };
  }

  return args;
}

/**
 * Build the Prisma client with the tenancy extension applied.
 *
 * The extension changes the client's static type (it adds a `$extends` brand
 * and narrows `$transaction` callback arg types) which would force every
 * consumer to switch from `PrismaClient` to a derived type. Instead we keep
 * the public type as the standard `PrismaClient`: the extension still runs at
 * runtime — every model call routes through `$allOperations` — but the rest
 * of the codebase keeps using the familiar Prisma types.
 *
 * The `orgId` column is already in the generated Prisma types (it was added
 * to the schema) so consumers get correct field types without needing the
 * extension's branded type.
 */
function makeClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  const base = new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  const extended = base.$extends({
    name: "org-tenancy",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const next = applyOrgFilter(
            model,
            operation,
            (args ?? {}) as AnyArgs,
          ) as typeof args;
          return query(next);
        },
      },
    },
  });

  return extended as unknown as PrismaClient;
}

export { Prisma };

export const db: PrismaClient = globalThis.prismaClient ?? makeClient();

if (env.NODE_ENV !== "production") {
  globalThis.prismaClient = db;
}
