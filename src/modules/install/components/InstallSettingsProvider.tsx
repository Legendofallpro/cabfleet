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
