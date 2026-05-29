/**
 * Notification provider contract (Phase 7 W2 §2.1).
 *
 * Two implementations live next to this file:
 *   - ResendEmailProvider       (channel: "EMAIL")
 *   - TwilioWhatsAppProvider    (channel: "WHATSAPP")
 *
 * Adding a new channel (SMS, push) is a new file implementing this interface
 * + a single line in the NotificationService factory.
 *
 * Providers MUST be tolerant of missing config — when API keys are not set
 * the provider should log a structured warning and return a stable
 * `providerMessageId` (e.g. "no-op") instead of throwing. This mirrors the
 * Phase-5 contract for `RESEND_API_KEY` and means dev/preview environments
 * stay green without secrets.
 */
import type { NotificationChannel } from "@prisma/client";

export type NotificationMessage = {
  channel: NotificationChannel;
  /** Email address or E.164 phone, depending on channel. */
  to: string;
  /** Logical template key — e.g. "BOOKING_ASSIGNED". */
  templateId: string;
  /** Interpolated variables. Already sanitized via `sanitizeTemplateVar`. */
  variables: Record<string, string | number>;
  /** BCP-47 locale ("en-IN" by default). */
  locale: string;
};

export type NotificationSendResult = {
  providerMessageId: string;
  /** `true` when the provider stub no-opped (missing config). */
  noop?: boolean;
};

export interface NotificationProvider {
  readonly channel: NotificationChannel;
  send(msg: NotificationMessage): Promise<NotificationSendResult>;
}
