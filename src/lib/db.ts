import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

declare global {
  var prismaClient: PrismaClient | undefined;
}

function makeClient() {
  // PrismaPg constructs lazily; no connection is opened until the first query.
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const db: PrismaClient = globalThis.prismaClient ?? makeClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaClient = db;
}
