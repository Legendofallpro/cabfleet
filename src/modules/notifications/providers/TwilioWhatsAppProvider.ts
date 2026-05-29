import type { NotificationChannel } from "@prisma/client";
import twilio, { type Twilio } from "twilio";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import {
  isKnownTemplate,
  TEMPLATES,
} from "@/modules/notifications/services/templates";
import { toE164 } from "@/lib/utils/phone";
import type {
  NotificationMessage,
  NotificationProvider,
  NotificationSendResult,
} from "@/modules/notifications/providers/NotificationProvider";

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

    const parsed = toE164(msg.to);
    if (!parsed.ok) {
      logger.warn(
        { templateId: msg.templateId, reason: parsed.reason },
        "notification.whatsapp.invalid_recipient",
      );
      return { providerMessageId: "noop:invalid_recipient", noop: true };
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
