/**
 * Best-effort invoice after a trip reaches COMPLETED.
 *
 * Must run *after* transitionBookingStatus returns — PDF + storage upload
 * must not hold the booking row lock. CONFLICT (already invoiced) is success.
 * Any other failure is logged; the trip complete still stands.
 *
 * Drivers call this without INVOICE_MANAGE — generateInvoice itself is not
 * permission-gated; the staff action is.
 */
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { sendInvoiceEmail } from "@/lib/email";
import { generateInvoice } from "@/modules/invoices/services/generateInvoice";
import { getInvoice } from "@/modules/invoices/queries/invoice";
import { portalInvoiceUrl } from "@/modules/invoices/invoice-storage";
import { env } from "@/lib/env";

export async function maybeGenerateInvoiceOnComplete(
  bookingId: string,
  actor: { id: string },
): Promise<void> {
  try {
    const result = await generateInvoice({ bookingId }, actor);
    if (!result.ok) {
      logger.warn(
        { bookingId, error: result.error },
        "invoice.auto_generate_skipped",
      );
      return;
    }

    try {
      const invoice = await getInvoice(result.data.id);
      if (invoice?.booking.customer.profile.email) {
        await sendInvoiceEmail({
          to: invoice.booking.customer.profile.email,
          customerName: invoice.booking.customer.profile.fullName ?? "Customer",
          invoiceNumber: invoice.number,
          invoiceUrl: portalInvoiceUrl(env.NEXT_PUBLIC_APP_URL, invoice.bookingId),
          bookingRef: invoice.bookingId.slice(-8).toUpperCase(),
        });
      }
    } catch (emailErr) {
      logger.error(
        { err: emailErr, invoiceId: result.data.id },
        "invoice.auto_email_failed",
      );
    }
  } catch (err) {
    if (err instanceof AppError && err.code === "CONFLICT") {
      logger.info({ bookingId }, "invoice.auto_generate_already_exists");
      return;
    }
    logger.error({ err, bookingId }, "invoice.auto_generate_failed");
  }
}
