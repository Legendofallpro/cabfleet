"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_MS = 20_000;

export function DashboardAutoRefresh({ intervalMs = DEFAULT_MS }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = window.setInterval(() => {
      router.refresh();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
