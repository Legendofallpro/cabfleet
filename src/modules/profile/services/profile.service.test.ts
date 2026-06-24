import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    profile: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/audit", () => ({
  writeAudit: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  env: {},
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  updateAvatarUrl,
  updateLocale,
  updateNotificationPrefs,
  updateProfile,
} from "./profile.service";

describe("profile.service", () => {
  const actor = { id: "profile-1" };
  const tx = {
    profile: { update: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.profile.findFirst).mockResolvedValue({
      id: "profile-1",
      fullName: "Ada Lovelace",
      phone: "+911234567890",
      locale: "en-IN",
      avatarUrl: null,
      notificationPrefs: { email: true },
      deletedAt: null,
    } as never);
    vi.mocked(db.$transaction).mockImplementation(
      async (fn: Parameters<typeof db.$transaction>[0]) => fn(tx as never),
    );
    vi.mocked(tx.profile.update).mockImplementation(async ({ data }) => ({
      id: "profile-1",
      ...data,
    }));
  });

  it("updates profile with trimmed name and normalized phone", async () => {
    const result = await updateProfile(
      { fullName: "  Grace Hopper  ", phone: "  " },
      actor,
    );

    expect(result.ok).toBe(true);
    expect(tx.profile.update).toHaveBeenCalledWith({
      where: { id: "profile-1" },
      data: { fullName: "Grace Hopper", phone: null },
    });
    expect(writeAudit).toHaveBeenCalled();
  });

  it("merges notification prefs onto existing JSON", async () => {
    const result = await updateNotificationPrefs(
      {
        email: false,
        whatsapp: true,
        timezone: "Asia/Kolkata",
        quietHoursStart: "22:00",
        quietHoursEnd: "07:00",
      },
      actor,
    );

    expect(result.ok).toBe(true);
    expect(tx.profile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          notificationPrefs: expect.objectContaining({
            email: false,
            whatsapp: true,
            quietHoursStart: "22:00",
            quietHoursEnd: "07:00",
          }),
        },
      }),
    );
  });

  it("updates locale with audit diff", async () => {
    const result = await updateLocale({ locale: "hi-IN" }, actor);
    expect(result.ok).toBe(true);
    expect(tx.profile.update).toHaveBeenCalledWith({
      where: { id: "profile-1" },
      data: { locale: "hi-IN" },
    });
  });

  it("updates avatar URL with audit diff", async () => {
    const url = "https://x.supabase.co/storage/v1/object/public/avatars/profile-1/a.jpg";
    const result = await updateAvatarUrl(url, actor);
    expect(result.ok).toBe(true);
    expect(tx.profile.update).toHaveBeenCalledWith({
      where: { id: "profile-1" },
      data: { avatarUrl: url },
    });
  });
});
