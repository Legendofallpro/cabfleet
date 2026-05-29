/**
 * NotificationService (Phase 7 W2 §2.1).
 *
 * Responsibilities:
 *   - Resolve `templateId` to the channels it fans out to (via `TEMPLATES`).
 *   - Honour per-recipient opt-out + quiet hours from `Profile.notificationPrefs`
 *     (urgent templates bypass quiet hours).
 *   - Dispatch one message per channel through the matching provider.
 *   - Write a NotificationLog row capturing the per-channel outcome.
 *
 * `dispatch` is called by `src/app/api/cron/drain-notifications/route.ts` —
 * never directly from request handlers. Request handlers enqueue an outbox
 * row via `enqueueNotification` instead, so notifications are atomic with
 * the booking transaction and provider latency never blocks the response.
 */
import type { NotificationChannel, PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { ResendEmailProvider } from "@/modules/notifications/providers/ResendEmailProvider";
import { TwilioWhatsAppProvider } from "@/modules/notifications/providers/TwilioWhatsAppProvider";
import type { NotificationProvider } from "@/modules/notifications/providers/NotificationProvider";
import { sanitizeVariables } from "@/modules/notifications/services/sanitize";
import { isKnownTemplate, TEMPLATES } from "@/modules/notifications/services/templates";

export type DispatchInput = {
  orgId: string | null;
  bookingId?: string | null;
  templateId: string;
  channel: NotificationChannel;
  recipient: string;
  variables: Record<string, string | number>;
  locale?: string;
  urgent?: boolean;
};

export type NotificationPrefs = {
  whatsapp?: boolean;
  email?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
};

export type DispatchOutcome = {
  ok: boolean;
  providerMessageId?: string;
  errorMessage?: string;
  /** `true` when prefs deferred or opted-out the message. */
  skipped?: boolean;
  skipReason?: string;
};

/**
 * Provider lookup. Constructed lazily once per process — they're stateless
 * apart from the Twilio client cache.
 */
const providers: Record<NotificationChannel, NotificationProvider> = {
  EMAIL: new ResendEmailProvider(),
  WHATSAPP: new TwilioWhatsAppProvider(),
};

/**
 * Parse "HH:MM" into total minutes since midnight. Returns null for malformed
 * input so callers can fall back to "no quiet hours configured".
 */
function parseHhmm(raw: string | undefined): number | null {
  if (!raw) return null;
  const m = /^(\d{2}):(\d{2})$/.exec(raw);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  return h * 60 + mm;
}

/**
 * `true` if the supplied UTC clock time falls inside [start, end] in the
 * supplied IANA tz. Handles ranges that wrap past midnight (e.g. 22:00–07:00).
 *
 * Implementation note: we render the wall-clock string in the supplied
 * timezone via `toLocaleTimeString(..., { hour12: false })` and parse back
 * to minutes. This avoids pulling in date-fns-tz or moment for one helper.
 */
function isInsideQuietHours(
  now: Date,
  startMin: number,
  endMin: number,
  timeZone: string,
): boolean {
  const localHhmm = now.toLocaleTimeString("en-GB", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });
  const cur = parseHhmm(localHhmm);
  if (cur === null) return false;
  return startMin <= endMin
    ? cur >= startMin && cur < endMin
    : cur >= startMin || cur < endMin;
}

/**
 * Apply opt-out + quiet-hour rules. Returns null if the message should be
 * sent; otherwise a `skipReason` for logging.
 */
function applyPrefsGate(
  channel: NotificationChannel,
  prefs: NotificationPrefs | null,
  urgent: boolean,
): string | null {
  if (!prefs) return null;
  const channelOptIn =
    channel === "WHATSAPP" ? prefs.whatsapp !== false : prefs.email !== false;
  if (!channelOptIn) return "opted_out";
  if (urgent) return null;

  const start = parseHhmm(prefs.quietHoursStart);
  const end = parseHhmm(prefs.quietHoursEnd);
  if (start === null || end === null) return null;

  const tz = prefs.timezone ?? "Asia/Kolkata";
  if (isInsideQuietHours(new Date(), start, end, tz)) {
    return "quiet_hours";
  }
  return null;
}

/**
 * Send a single message. Writes a NotificationLog row on the outcome.
 *
 * The `tx` parameter is optional — when present the log row is part of the
 * caller's transaction; otherwise we use the global `db` client.
 */
export async function dispatch(
  input: DispatchInput,
  tx?: PrismaClient,
): Promise<DispatchOutcome> {
  const client = tx ?? db;

  if (!env.NOTIFICATIONS_ENABLED) {
    logger.info(
      { templateId: input.templateId, channel: input.channel },
      "notification.disabled.flag_off",
    );
    return { ok: true, skipped: true, skipReason: "flag_off" };
  }

  if (!isKnownTemplate(input.templateId)) {
    return {
      ok: false,
      errorMessage: `Unknown template: ${input.templateId}`,
    };
  }

  const tpl = TEMPLATES[input.templateId];
  const urgent = input.urgent ?? tpl.urgent;

  // Look up the recipient's prefs by either email or phone. Customer-side
  // notifications are the common case, so we match on the contact channel.
  // Prefs are optional — absence means "send through".
  let prefs: NotificationPrefs | null = null;
  try {
    const profile = await client.profile.findFirst({
      where:
        input.channel === "EMAIL"
          ? { email: input.recipient }
          : { phone: input.recipient },
      select: { notificationPrefs: true },
    });
    prefs = (profile?.notificationPrefs ?? null) as NotificationPrefs | null;
  } catch (err) {
    logger.warn(
      { err, channel: input.channel },
      "notification.prefs.lookup_failed",
    );
  }

  const skipReason = applyPrefsGate(input.channel, prefs, urgent);
  if (skipReason) {
    logger.info(
      { templateId: input.templateId, channel: input.channel, skipReason },
      "notification.skipped",
    );
    return { ok: true, skipped: true, skipReason };
  }

  const safeVars = sanitizeVariables(input.variables);
  const provider = providers[input.channel];

  try {
    const result = await provider.send({
      channel: input.channel,
      to: input.recipient,
      templateId: input.templateId,
      variables: safeVars,
      locale: input.locale ?? "en-IN",
    });

    await client.notificationLog.create({
      data: {
        orgId: input.orgId,
        bookingId: input.bookingId ?? null,
        channel: input.channel,
        templateId: input.templateId,
        recipient: input.recipient,
        status: "SENT",
        providerMessageId: result.providerMessageId,
        sentAt: result.noop ? null : new Date(),
      },
    });

    return { ok: true, providerMessageId: result.providerMessageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(
      { err, templateId: input.templateId, channel: input.channel },
      "notification.send_failed",
    );
    await client.notificationLog.create({
      data: {
        orgId: input.orgId,
        bookingId: input.bookingId ?? null,
        channel: input.channel,
        templateId: input.templateId,
        recipient: input.recipient,
        status: "FAILED",
        errorMessage: message.slice(0, 500),
      },
    });
    return { ok: false, errorMessage: message };
  }
}
