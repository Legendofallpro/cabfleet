import { db } from "@/lib/db";
import type { InstallSettings } from "@prisma/client";

export async function getInstallSettings(): Promise<InstallSettings | null> {
  return db.installSettings.findUnique({ where: { id: "default" } });
}
