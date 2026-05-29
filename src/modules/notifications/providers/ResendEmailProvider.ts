import type { NotificationChannel } from "@prisma/client";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { isKnownTemplate, TEMPLATES } from "@/modules/notifications/services/templates";
import type {
  NotificationMessage,
  NotificationProvider,
  NotificationSendResult,
} from "@/modules/notifications/providers/NotificationProvider";

/**
 * Resend-backed EMAIL provider. Reuses `src/lib/email.ts`'s `sendEmail`
 * (which already no-ops when `RESEND_API_KEY` is missing).
 */
export class ResendEmailProvider implements NotificationProvider {
  readonly channel: NotificationChannel = "EMAIL";

  async send(msg: NotificationMessage): Promise<NotificationSendResult> {
    if (!isKnownTemplate(msg.templateId)) {
      logger.warn(
        { templateId: msg.templateId, channel: "EMAIL" },
        "notification.email.unknown_template",
      );
      return { providerMessageId: "noop:unknown_template", noop: true };
    }

    const tpl = TEMPLATES[msg.templateId];
    const rendered = tpl.renderEmail(msg.variables);
    if (!rendered.subject) {
      // Template intentionally has no EMAIL rendering (e.g. WhatsApp-only).
      return { providerMessageId: "noop:no_email_rendering", noop: true };
    }

    // sendEmail throws on Resend errors and no-ops on missing key. We can't
    // recover the provider message id today — sendEmail discards it — so we
    // surface a stable synthetic id and rely on Resend's own dashboards for
    // delivery introspection. The structured log in sendEmail already keys
    // off (to, subject).
    await sendEmail({
      to: msg.to,
      subject: rendered.subject,
      html: rendered.html,
    });
    return { providerMessageId: `resend:${Date.now()}` };
  }
}
