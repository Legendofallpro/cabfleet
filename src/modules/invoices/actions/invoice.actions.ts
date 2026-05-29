"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { action } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/requireRole";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { ok, err } from "@/lib/result";
import { logger } from "@/lib/logger";
import { generateInvoice } from "@/modules/invoices/services/generateInvoice";
import { generateInvoiceSchema } from "@/modules/invoices/validators/invoice";
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

    const invoice = await db.invoice.findFirst({
      where: { id: invoiceId, deletedAt: null },
    });
    if (!invoice) {
      return err({ code: "NOT_FOUND", message: "Invoice not found." });
    }

    await db.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: "VOID", pdfUrl: null, updatedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          entity: "Invoice",
          entityId: invoiceId,
          action: "STATUS_CHANGE",
          byProfileId: actor.profile.id,
          diff: { before: { status: invoice.status }, after: { status: "VOID" } },
        },
      });
    });

    revalidatePath("/invoices");
    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath(`/bookings/${invoice.bookingId}`);
    revalidatePath(`/portal/bookings/${invoice.bookingId}`);
    logger.info({ invoiceId, actor: actor.profile.id }, "invoice.voided");

    return ok(invoiceId);
  },
);
