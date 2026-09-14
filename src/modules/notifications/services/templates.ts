/**
 * Notification template registry (Phase 7 W2).
 *
 * The single source of truth for:
 *   - which channels a logical template fans out to,
 *   - how to render the subject + body for the EMAIL channel,
 *   - whether the template is "urgent" (bypasses quiet hours),
 *   - which WhatsApp template name maps to the logical id (for the Twilio
 *     content-API path once templates are approved).
 *
 * Adding a new transactional notification = a new entry here + a row in
 * `notifyOnTransition` (if it fires from a booking state change).
 */
import type { NotificationChannel } from "@prisma/client";

export type TemplateId =
  | "BOOKING_CLAIMED"
  | "BOOKING_ASSIGNED"
  | "BOOKING_STARTED"
  | "BOOKING_IN_PROGRESS"
  | "BOOKING_COMPLETED"
  | "BOOKING_CANCELLED";

export type EmailRendering = {
  subject: string;
  html: string;
};

export type TemplateDefinition = {
  channels: NotificationChannel[];
  /** Bypass per-recipient quiet hours when set. Booking cancellations only. */
  urgent: boolean;
  /**
   * Twilio Content API template SID — populated once Meta/Twilio approves
   * the WhatsApp template. Until approval, the Twilio provider no-ops with
   * a structured log line.
   */
  whatsappTemplateSid?: string;
  /**
   * Render the EMAIL message body. Variables are already sanitized at the
   * service layer (`sanitizeVariables`).
   */
  renderEmail(variables: Record<string, string | number>): EmailRendering;
  /**
   * Render a plain-text fallback body for WhatsApp pre-approval. Until the
   * pre-approved template SID lands, the provider may use this body when
   * Twilio's sandbox is configured.
   */
  renderWhatsApp(variables: Record<string, string | number>): string;
};

function strOrEmpty(v: string | number | undefined): string {
  if (v === undefined) return "";
  return typeof v === "number" ? String(v) : v;
}

const emailShell = (heading: string, body: string) => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="font-family:sans-serif;color:#1a1a1a;background:#f9fafb;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.07);">
    <div style="background:#2563eb;padding:24px 32px;">
      <h1 style="margin:0;font-size:22px;color:#fff;font-weight:700;">CabFleet</h1>
      <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px;">${heading}</p>
    </div>
    <div style="padding:32px;font-size:14px;color:#374151;line-height:1.6;">${body}</div>
  </div>
</body>
</html>`;

export const TEMPLATES: Record<TemplateId, TemplateDefinition> = {
  BOOKING_CLAIMED: {
    channels: ["EMAIL", "WHATSAPP"],
    urgent: false,
    renderEmail: (v) => ({
      subject: `A driver claimed your booking #${strOrEmpty(v.bookingRef)}`,
      html: emailShell(
        "Driver assigned",
        `<p>Hi ${strOrEmpty(v.customerName)},</p>
         <p>A driver has accepted your trip <strong>#${strOrEmpty(v.bookingRef)}</strong>
         scheduled for <strong>${strOrEmpty(v.pickupAt)}</strong>.</p>
         <p>Driver: <strong>${strOrEmpty(v.driverName)}</strong></p>`,
      ),
    }),
    renderWhatsApp: (v) =>
      `Booking #${strOrEmpty(v.bookingRef)}: driver ${strOrEmpty(v.driverName)} has accepted your trip. Pickup ${strOrEmpty(v.pickupAt)}.`,
  },

  BOOKING_ASSIGNED: {
    channels: ["EMAIL", "WHATSAPP"],
    urgent: false,
    renderEmail: (v) => ({
      subject: `Driver assigned to booking #${strOrEmpty(v.bookingRef)}`,
      html: emailShell(
        "Driver assigned",
        `<p>Hi ${strOrEmpty(v.customerName)},</p>
         <p>Your trip <strong>#${strOrEmpty(v.bookingRef)}</strong> has been assigned
         to <strong>${strOrEmpty(v.driverName)}</strong>.</p>
         <p>Pickup: <strong>${strOrEmpty(v.pickupAt)}</strong>.</p>`,
      ),
    }),
    renderWhatsApp: (v) =>
      `Booking #${strOrEmpty(v.bookingRef)}: assigned to ${strOrEmpty(v.driverName)}. Pickup ${strOrEmpty(v.pickupAt)}.`,
  },

  BOOKING_STARTED: {
    channels: ["EMAIL", "WHATSAPP"],
    urgent: false,
    renderEmail: (v) => ({
      subject: `Your driver is on the way — #${strOrEmpty(v.bookingRef)}`,
      html: emailShell(
        "Driver on the way",
        `<p>Hi ${strOrEmpty(v.customerName)},</p>
         <p><strong>${strOrEmpty(v.driverName)}</strong> is on the way for trip
         <strong>#${strOrEmpty(v.bookingRef)}</strong>.</p>`,
      ),
    }),
    renderWhatsApp: (v) =>
      `Booking #${strOrEmpty(v.bookingRef)}: ${strOrEmpty(v.driverName)} is on the way.`,
  },

  BOOKING_IN_PROGRESS: {
    channels: ["EMAIL", "WHATSAPP"],
    urgent: false,
    renderEmail: (v) => ({
      subject: `Your trip has started — #${strOrEmpty(v.bookingRef)}`,
      html: emailShell(
        "Trip started",
        `<p>Hi ${strOrEmpty(v.customerName)},</p>
         <p>Trip <strong>#${strOrEmpty(v.bookingRef)}</strong> has started.
         Driver: <strong>${strOrEmpty(v.driverName)}</strong>.</p>`,
      ),
    }),
    renderWhatsApp: (v) =>
      `Booking #${strOrEmpty(v.bookingRef)} has started. Driver ${strOrEmpty(v.driverName)}.`,
  },

  BOOKING_COMPLETED: {
    channels: ["EMAIL", "WHATSAPP"],
    urgent: false,
    renderEmail: (v) => ({
      subject: `Your CabFleet trip is complete — #${strOrEmpty(v.bookingRef)}`,
      html: emailShell(
        "Trip complete",
        `<p>Hi ${strOrEmpty(v.customerName)},</p>
         <p>Thanks for riding with CabFleet. Trip <strong>#${strOrEmpty(v.bookingRef)}</strong>
         is complete. An invoice will follow shortly.</p>`,
      ),
    }),
    renderWhatsApp: (v) =>
      `Booking #${strOrEmpty(v.bookingRef)} is complete. Thanks for riding with CabFleet!`,
  },

  BOOKING_CANCELLED: {
    channels: ["EMAIL", "WHATSAPP"],
    urgent: true,
    renderEmail: (v) => ({
      subject: `Booking #${strOrEmpty(v.bookingRef)} cancelled`,
      html: emailShell(
        "Booking cancelled",
        `<p>Hi ${strOrEmpty(v.customerName)},</p>
         <p>Your booking <strong>#${strOrEmpty(v.bookingRef)}</strong> has been
         cancelled.</p>
         <p>Reason: ${strOrEmpty(v.reason)}</p>`,
      ),
    }),
    renderWhatsApp: (v) =>
      `Booking #${strOrEmpty(v.bookingRef)} has been cancelled. Reason: ${strOrEmpty(v.reason)}.`,
  },
};

export function isKnownTemplate(id: string): id is TemplateId {
  return Object.prototype.hasOwnProperty.call(TEMPLATES, id);
}
