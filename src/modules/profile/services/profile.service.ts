import { Prisma } from "@prisma/client";

import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { ok, type Result } from "@/lib/result";
import type {
  UpdateNotificationPrefsInput,
  UpdateProfileInput,
} from "@/modules/profile/validators/profile";
import type { NotificationPrefs } from "@/modules/notifications/services/NotificationService";
import type { Profile } from "@prisma/client";

type Actor = { id: string };

function normalizePhone(phone: string | null | undefined): string | null {
  const trimmed = phone?.trim();
  return trimmed ? trimmed : null;
}

export async function updateProfile(
  input: UpdateProfileInput,
  actor: Actor,
): Promise<Result<Profile>> {
  const current = await db.profile.findFirst({
    where: { id: actor.id, deletedAt: null },
  });
  if (!current) throw new AppError("NOT_FOUND", "Profile not found.");

  const phone = normalizePhone(input.phone);

  const profile = await db.$transaction(async (tx) => {
    const updated = await tx.profile.update({
      where: { id: actor.id },
      data: {
        fullName: input.fullName.trim(),
        phone,
      },
    });
    await writeAudit(tx, {
      entity: "Profile",
      entityId: updated.id,
      action: "UPDATE",
      byProfileId: actor.id,
      diff: { before: current, after: updated },
    });
    return updated;
  });

  return ok(profile);
}

export async function updateNotificationPrefs(
  input: UpdateNotificationPrefsInput,
  actor: Actor,
): Promise<Result<Profile>> {
  const current = await db.profile.findFirst({
    where: { id: actor.id, deletedAt: null },
  });
  if (!current) throw new AppError("NOT_FOUND", "Profile not found.");

  const existing = (current.notificationPrefs ?? {}) as NotificationPrefs;
  const prefs: NotificationPrefs = {
    ...existing,
    whatsapp: input.whatsapp,
    email: input.email,
    timezone: input.timezone,
    quietHoursStart: input.quietHoursStart?.trim() || undefined,
    quietHoursEnd: input.quietHoursEnd?.trim() || undefined,
  };

  const profile = await db.$transaction(async (tx) => {
    const updated = await tx.profile.update({
      where: { id: actor.id },
      data: {
        notificationPrefs: prefs as Prisma.InputJsonValue,
      },
    });
    await writeAudit(tx, {
      entity: "Profile",
      entityId: updated.id,
      action: "UPDATE",
      byProfileId: actor.id,
      diff: { before: { notificationPrefs: current.notificationPrefs }, after: { notificationPrefs: prefs } },
    });
    return updated;
  });

  return ok(profile);
}

export async function updateLocale(
  input: { locale: string },
  actor: Actor,
): Promise<Result<Profile>> {
  const current = await db.profile.findFirst({
    where: { id: actor.id, deletedAt: null },
  });
  if (!current) throw new AppError("NOT_FOUND", "Profile not found.");

  const profile = await db.$transaction(async (tx) => {
    const updated = await tx.profile.update({
      where: { id: actor.id },
      data: { locale: input.locale },
    });
    await writeAudit(tx, {
      entity: "Profile",
      entityId: updated.id,
      action: "UPDATE",
      byProfileId: actor.id,
      diff: { before: { locale: current.locale }, after: { locale: updated.locale } },
    });
    return updated;
  });

  return ok(profile);
}

export async function updateAvatarUrl(
  avatarUrl: string,
  actor: Actor,
): Promise<Result<Profile>> {
  const current = await db.profile.findFirst({
    where: { id: actor.id, deletedAt: null },
  });
  if (!current) throw new AppError("NOT_FOUND", "Profile not found.");

  const profile = await db.$transaction(async (tx) => {
    const updated = await tx.profile.update({
      where: { id: actor.id },
      data: { avatarUrl },
    });
    await writeAudit(tx, {
      entity: "Profile",
      entityId: updated.id,
      action: "UPDATE",
      byProfileId: actor.id,
      diff: { before: { avatarUrl: current.avatarUrl }, after: { avatarUrl: updated.avatarUrl } },
    });
    return updated;
  });

  return ok(profile);
}
