import type { NotificationChannel } from "@prisma/client";
import twilio, { type Twilio } from "twilio";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { checkLimit } from "@/lib/rate-limit";
import {
  isKnownTemplate,
  TEMPLATES,
} from "@/modules/notifications/services/templates";
import { toE164, resolvePhoneRegion } from "@/lib/utils/phone";
import type {
  NotificationMessage,
  NotificationProvider,
  NotificationSendResult,
} from "@/modules/notifications/providers/NotificationProvider";
import { getInstallSettings } from "@/modules/install/queries/install";

/**
 * §7.4 S8: parse "max:windowSeconds" env into limiter options once at module
 * load. A malformed value falls back to the documented default rather than
 * crashing the provider — the limit is defence-in-depth, not load-bearing.
 */
function parseRecipientLimit(raw: string | undefined): { max: number; windowMs: number } {
  const [maxRaw, windowRaw] = (raw ?? "10:3600").split(":");
  const max = Number(maxRaw);
  const windowSec = Number(windowRaw);
  if (Number.isFinite(max) && max > 0 && Number.isFinite(windowSec) && windowSec > 0) {
    return { max, windowMs: windowSec * 1000 };
  }
  logger.warn(
    { raw },
    "twilio.recipient_limit.malformed.using_default_10_per_hour",
  );
  return { max: 10, windowMs: 60 * 60 * 1000 };
}

const RECIPIENT_LIMIT = parseRecipientLimit(env.TWILIO_PER_RECIPIENT_LIMIT);

/** Schema default in env.ts. Treated as unset when install country is known. */
const TWILIO_ALLOWED_COUNTRIES_DEFAULT = "IN";

/**
 * Resolve the WhatsApp country allow-list.
 * Explicit TWILIO_ALLOWED_COUNTRIES wins; the schema default `"IN"` yields to
 * install country when that is set.
 */
export function resolveTwilioAllowedCountries(
  envValue: string,
  installCountry: string | null | undefined,
): Set<string> | null {
  const trimmed = envValue.trim();
  const useInstall =
    trimmed.toUpperCase() === TWILIO_ALLOWED_COUNTRIES_DEFAULT &&
    Boolean(installCountry);
  const raw = useInstall ? String(installCountry) : envValue;
  const cleaned = raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  return cleaned.length === 0 ? null : new Set(cleaned);
}

/**
 * Twilio WhatsApp provider.
 *
 * No-ops when any of `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, or
 * `TWILIO_WHATSAPP_FROM` is missing — same shape as `sendEmail` for dev
 * environments without secrets.
 *
 * Until pre-approved WhatsApp templates land (Meta/Twilio approval is the
 * day-one external blocker called out in plan §6.2), the provider falls
 * back to plain-text sandbox messaging using the template's
 * `renderWhatsApp(...)` body. Once approval comes through, swap the call
 * site to use the Content API + template SID.
 */
export class TwilioWhatsAppProvider implements NotificationProvider {
  readonly channel: NotificationChannel = "WHATSAPP";

  private client: Twilio | null = null;

  private getClient(): Twilio | null {
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) return null;
    if (!this.client) {
      this.client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
    }
    return this.client;
  }

  async send(msg: NotificationMessage): Promise<NotificationSendResult> {
    if (!isKnownTemplate(msg.templateId)) {
      logger.warn(
        { templateId: msg.templateId, channel: "WHATSAPP" },
        "notification.whatsapp.unknown_template",
      );
      return { providerMessageId: "noop:unknown_template", noop: true };
    }

    const client = this.getClient();
    const from = env.TWILIO_WHATSAPP_FROM;
    if (!client || !from) {
      logger.warn(
        { templateId: msg.templateId, to: msg.to },
        "notification.whatsapp.skipped.no_credentials",
      );
      return { providerMessageId: "noop:no_twilio_credentials", noop: true };
    }

    const install = await getInstallSettings();
    const parsed = toE164(msg.to, resolvePhoneRegion(install?.phoneRegion));
    if (!parsed.ok) {
      logger.warn(
        { templateId: msg.templateId, reason: parsed.reason },
        "notification.whatsapp.invalid_recipient",
      );
      return { providerMessageId: "noop:invalid_recipient", noop: true };
    }

    // §7.4 S8: country allow-list check. parsed.country is null for
    // numbers that libphonenumber-js can't attribute (rare; we still got
    // a valid E.164 string, just no geo).
    const allowedCountries = resolveTwilioAllowedCountries(
      env.TWILIO_ALLOWED_COUNTRIES,
      install?.country,
    );
    if (allowedCountries && parsed.country && !allowedCountries.has(parsed.country)) {
      logger.warn(
        {
          templateId: msg.templateId,
          country: parsed.country,
          allowed: Array.from(allowedCountries),
        },
        "notification.whatsapp.country_not_allowed",
      );
      return { providerMessageId: "noop:country_not_allowed", noop: true };
    }

    // §7.4 S8: per-recipient rate limit — defeats template loops and
    // burst spam. The limiter is Upstash-backed in prod (shared across
    // instances) and in-memory in dev; see src/lib/rate-limit.ts.
    const limit = await checkLimit(`twilio:recipient:${parsed.e164}`, RECIPIENT_LIMIT);
    if (!limit.success) {
      logger.warn(
        {
          templateId: msg.templateId,
          recipient: parsed.e164,
          resetAt: new Date(limit.resetAt).toISOString(),
        },
        "notification.whatsapp.rate_limited",
      );
      return { providerMessageId: "noop:rate_limited", noop: true };
    }

    const tpl = TEMPLATES[msg.templateId];
    const body = tpl.renderWhatsApp(msg.variables);

    const message = await client.messages.create({
      from: `whatsapp:${from}`,
      to: `whatsapp:${parsed.e164}`,
      body,
    });

    return { providerMessageId: message.sid };
  }
}
