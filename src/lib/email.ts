/**
 * Thin email wrapper around Resend.
 * RESEND_API_KEY is optional so dev environments without it still build.
 * If the key is absent, emails are logged and silently dropped.
 *
 * Server-only — never import from a "use client" component.
 */
import { Resend } from "resend";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

let resend: Resend | null = null;

function getResend(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(env.RESEND_API_KEY);
  return resend;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const client = getResend();
  if (!client) {
    logger.warn({ to: params.to, subject: params.subject }, "email.skipped.no_api_key");
    return;
  }

  const { error } = await client.emails.send({
    from: "CabFleet <noreply@cabfleet.app>",
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  if (error) {
    logger.error({ to: params.to, error }, "email.send_failed");
    throw new Error(`Resend error: ${error.message}`);
  }

  logger.info({ to: params.to, subject: params.subject }, "email.sent");
}

// ──────────────────────────────────────────────────────────────────────────────
// Typed email templates
// ──────────────────────────────────────────────────────────────────────────────

export interface InvoiceEmailParams {
  to: string;
  customerName: string;
  invoiceNumber: string;
  invoiceUrl: string;
  bookingRef: string;
}

export async function sendInvoiceEmail(params: InvoiceEmailParams): Promise<void> {
  await sendEmail({
    to: params.to,
    subject: `Your CabFleet Invoice ${params.invoiceNumber}`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice ${params.invoiceNumber}</title>
</head>
<body style="font-family:sans-serif;color:#1a1a1a;background:#f9fafb;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.07);">
    <div style="background:#2563eb;padding:24px 32px;">
      <h1 style="margin:0;font-size:22px;color:#fff;font-weight:700;">CabFleet</h1>
      <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px;">Invoice Notification</p>
    </div>
    <div style="padding:32px;">
      <p style="font-size:15px;margin:0 0 16px;">Hi ${params.customerName},</p>
      <p style="font-size:14px;color:#374151;margin:0 0 24px;">
        Your invoice <strong>${params.invoiceNumber}</strong> for booking
        <strong>#${params.bookingRef}</strong> is ready. Sign in to view it.
      </p>
      <a href="${params.invoiceUrl}"
         style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
        View invoice
      </a>
      <p style="font-size:12px;color:#9ca3af;margin:24px 0 0;">
        If the button above doesn't work, copy this link into your browser:<br/>
        <a href="${params.invoiceUrl}" style="color:#2563eb;word-break:break-all;">${params.invoiceUrl}</a>
      </p>
    </div>
    <div style="background:#f3f4f6;padding:16px 32px;text-align:center;">
      <p style="font-size:11px;color:#9ca3af;margin:0;">
        © ${new Date().getFullYear()} CabFleet. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>`,
  });
}
