import type { StatusTone } from "@/components/common/StatusBadge";

/** Client-safe role labels for profile UI. */
export const PROFILE_ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  STAFF: "Staff",
  DRIVER: "Driver",
  CUSTOMER: "Customer",
};

export const PROFILE_ROLE_TONE: Record<string, StatusTone> = {
  SUPER_ADMIN: "warning",
  ADMIN: "info",
  STAFF: "neutral",
  DRIVER: "success",
  CUSTOMER: "neutral",
};
