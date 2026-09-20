"use client";

import { createContext, useContext } from "react";

import type { InstallSettingsView } from "@/modules/install/install.constants";

const InstallSettingsContext = createContext<InstallSettingsView | null>(null);

export function InstallSettingsProvider({
  settings,
  children,
}: {
  settings: InstallSettingsView | null;
  children: React.ReactNode;
}) {
  return (
    <InstallSettingsContext.Provider value={settings}>
      {children}
    </InstallSettingsContext.Provider>
  );
}

export function useInstallSettings(): InstallSettingsView | null {
  return useContext(InstallSettingsContext);
}

/** Gated layouts should already have redirected if setup is incomplete. */
export function useRequiredInstallSettings(): InstallSettingsView {
  const settings = useInstallSettings();
  if (!settings) {
    throw new Error("Install settings missing");
  }
  return settings;
}
