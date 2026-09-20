import { db } from "@/lib/db";
import type { InstallSettings } from "@prisma/client";
import type { InstallSettingsView } from "@/modules/install/install.constants";

export async function getInstallSettings(): Promise<InstallSettings | null> {
  return db.installSettings.findUnique({ where: { id: "default" } });
}

export async function requireInstallSettings(): Promise<InstallSettings> {
  const settings = await getInstallSettings();
  if (!settings) {
    throw new Error("Install settings missing");
  }
  return settings;
}

export function toView(settings: InstallSettings): InstallSettingsView {
  return {
    country: settings.country,
    currency: settings.currency,
    locale: settings.locale,
    timezone: settings.timezone,
    phoneRegion: settings.phoneRegion,
    taxIdLabel: settings.taxIdLabel,
    taxRate: settings.taxRate,
    setupCompletedAt: settings.setupCompletedAt?.toISOString() ?? null,
  };
}
