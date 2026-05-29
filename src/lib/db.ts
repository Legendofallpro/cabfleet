import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { env } from "@/lib/env";

declare global {
  var prismaClient: PrismaClient | undefined;
}

function makeClient() {
  // PrismaPg constructs lazily; no connection is opened until the first query.
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const db: PrismaClient = globalThis.prismaClient ?? makeClient();

if (env.NODE_ENV !== "production") {
  globalThis.prismaClient = db;
}
