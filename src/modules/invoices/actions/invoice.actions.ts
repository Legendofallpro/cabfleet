"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { action } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/requireRole";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ok } from "@/lib/result";
import { logger } from "@/lib/logger";
import { generateInvoice } from "@/modules/invoices/services/generateInvoice";
import { generateInvoiceSchema } from "@/modules/invoices/validators/invoice";
import { voidInvoice } from "@/modules/invoices/services/voidInvoice";
import { sendInvoiceEmail } from "@/lib/email";
import { getInvoice } from "@/modules/invoices/queries/invoice";

export const generateInvoiceAction = action(
  "invoice.generate",
  generateInvoiceSchema,
  async (input) => {
    const actor = await requirePermission(PERMISSIONS.INVOICE_MANAGE);
    const result = await generateInvoice(input, { id: actor.profile.id });

    if (result.ok) {
      revalidatePath("/invoices");
      revalidatePath(`/bookings/${input.bookingId}`);

      // Send email to customer (non-blocking — don't fail the action if email fails)
      try {
        const invoice = await getInvoice(result.data.id);
        if (invoice?.booking.customer.profile.email && invoice.pdfUrl) {
          await sendInvoiceEmail({
            to: invoice.booking.customer.profile.email,
            customerName:
              invoice.booking.customer.profile.fullName ?? "Customer",
            invoiceNumber: invoice.number,
            pdfUrl: invoice.pdfUrl,
            bookingRef: invoice.bookingId.slice(-8).toUpperCase(),
          });
        }
      } catch (emailErr) {
        logger.error(
          { err: emailErr, invoiceId: result.data.id },
          "invoice.email_send_failed",
        );
      }
    }

    return result;
  },
);

const voidInvoiceSchema = z.object({
  invoiceId: z.string().uuid("Invalid invoice id"),
});

export const voidInvoiceAction = action(
  "invoice.void",
  voidInvoiceSchema,
  async ({ invoiceId }) => {
    const actor = await requirePermission(PERMISSIONS.INVOICE_MANAGE);
    const result = await voidInvoice(invoiceId, { id: actor.profile.id });
    if (!result.ok) return result;

    revalidatePath("/invoices");
    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath(`/bookings/${result.data.bookingId}`);
    revalidatePath(`/portal/bookings/${result.data.bookingId}`);

    return ok(invoiceId);
  },
);
