/**
 * generateInvoice — creates the Invoice row, generates a PDF via @react-pdf/renderer,
 * uploads it to Supabase Storage (bucket: "invoices"), and stores the signed URL.
 * All DB writes happen inside a single Prisma transaction.
 *
 * Server-only: never import from a "use client" component.
 */
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { writeAudit } from "@/lib/audit";
import { ok, type Result } from "@/lib/result";
import { logger } from "@/lib/logger";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { InvoicePDF, type InvoicePDFData } from "./invoice-pdf";
import type { GenerateInvoiceInput } from "@/modules/invoices/validators/invoice";

type Actor = { id: string };

const INVOICE_BUCKET = "invoices";
const SIGNED_URL_EXPIRY_SECS = 60 * 60 * 24 * 365; // 1 year

type InvoiceRecord = {
  id: string;
  bookingId: string;
  number: string;
  pdfUrl: string | null;
  issuedAt: Date;
  dueAt: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

/** Generate a unique, sequential-ish invoice number: INV-YYYYMM-XXXXX */
function getInvoiceNumberPrefix(at = new Date()): string {
  return `INV-${at.getFullYear()}${String(at.getMonth() + 1).padStart(2, "0")}`;
}

async function nextInvoiceNumber(
  prefix: string,
  getLatestInvoiceNumber: (lockedPrefix: string) => Promise<string | null>,
): Promise<string> {
  const latestInvoiceNumber = await getLatestInvoiceNumber(prefix);
  const nextSequence = latestInvoiceNumber
    ? Number(latestInvoiceNumber.slice(prefix.length + 1)) + 1
    : 1;
  return `${prefix}-${String(nextSequence).padStart(5, "0")}`;
}

export async function generateInvoice(
  input: GenerateInvoiceInput,
  actor: Actor,
): Promise<Result<InvoiceRecord>> {
  // 1. Pre-flight: check booking exists and doesn't already have an invoice
  const booking = await db.booking.findFirst({
    where: { id: input.bookingId, deletedAt: null },
    include: {
      branch: { select: { name: true } },
      customer: {
        include: {
          profile: { select: { fullName: true, email: true, phone: true } },
        },
      },
      invoice: { select: { id: true, status: true, deletedAt: true } },
    },
  });

  if (!booking) {
    throw new AppError("NOT_FOUND", "Booking not found.");
  }
  const voidInvoiceId =
    booking.invoice && !booking.invoice.deletedAt && booking.invoice.status === "VOID"
      ? booking.invoice.id
      : null;

  if (booking.invoice && !booking.invoice.deletedAt && booking.invoice.status !== "VOID") {
    throw new AppError("CONFLICT", "An invoice already exists for this booking.");
  }

  const supabase = getSupabaseAdminClient();

  // 6. Write Invoice row + AuditLog in a single transaction
  let invoiceNumber = "";
  let storagePath = "";
  const invoice = await db.$transaction(async (tx) => {
    const prefix = getInvoiceNumberPrefix();
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${prefix}))`;

    const activeInvoice = await tx.invoice.findFirst({
      where: { bookingId: input.bookingId, deletedAt: null, status: { not: "VOID" } },
      select: { id: true },
    });
    if (activeInvoice) {
      throw new AppError("CONFLICT", "An invoice already exists for this booking.");
    }

    const existingVoidInvoice = voidInvoiceId
      ? await tx.invoice.findFirst({
          where: {
            id: voidInvoiceId,
            bookingId: input.bookingId,
            deletedAt: null,
            status: "VOID",
          },
        })
      : null;

    invoiceNumber = await nextInvoiceNumber(
      prefix,
      (lockedPrefix) =>
        tx.invoice
          .findFirst({
            where: { number: { startsWith: lockedPrefix } },
            orderBy: { number: "desc" },
            select: { number: true },
          })
          .then((row) => row?.number ?? null),
    );

    // 2. Build PDF data
    const issuedAt = new Date();
    const pdfData: InvoicePDFData = {
      invoiceNumber,
      issuedAt,
      dueAt: input.dueAt ?? null,
      customerName: booking.customer.profile.fullName ?? booking.customer.profile.email,
      customerEmail: booking.customer.profile.email,
      customerPhone: booking.customer.profile.phone,
      branchName: booking.branch.name,
      pickupAddress: booking.pickupAddress,
      dropAddress: booking.dropAddress,
      pickupAt: booking.pickupAt,
      fareEstimate: booking.fareEstimate ? Number(booking.fareEstimate) : null,
      fareFinal: booking.fareFinal ? Number(booking.fareFinal) : null,
      bookingRef: booking.id.slice(-8).toUpperCase(),
    };

    // 3. Render PDF to buffer (server-side)
    // @react-pdf/renderer's renderToBuffer accepts a React element whose root is <Document>.
    // The InvoicePDF component renders exactly that. The cast is necessary because
    // react-pdf exports a stricter DocumentProps type that doesn't widen cleanly.
    const element = React.createElement(InvoicePDF, { data: pdfData });
    const pdfBuffer = await renderToBuffer(
      element as Parameters<typeof renderToBuffer>[0],
    );

    // 4. Upload PDF to Supabase Storage using service-role client
    storagePath = `${invoiceNumber}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from(INVOICE_BUCKET)
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      logger.error({ invoiceNumber, error: uploadError }, "invoice.pdf.upload_failed");
      throw new AppError("INTERNAL", "Failed to upload invoice PDF. Please try again.");
    }

    // 5. Get a long-lived signed URL for the PDF
    const { data: signedData, error: signedError } = await supabase.storage
      .from(INVOICE_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECS);

    if (signedError ?? !signedData?.signedUrl) {
      logger.error({ invoiceNumber, error: signedError }, "invoice.pdf.signed_url_failed");
      throw new AppError("INTERNAL", "Failed to generate PDF download URL.");
    }

    const pdfUrl = signedData.signedUrl;

    if (existingVoidInvoice) {
      const updated = await tx.invoice.update({
        where: { id: existingVoidInvoice.id },
        data: {
          number: invoiceNumber,
          pdfUrl,
          issuedAt,
          dueAt: input.dueAt ?? null,
          status: "ISSUED",
          updatedAt: new Date(),
        },
      });

      await writeAudit(tx, {
        entity: "Invoice",
        entityId: updated.id,
        action: "UPDATE",
        byProfileId: actor.id,
        diff: {
          before: {
            number: existingVoidInvoice.number,
            pdfUrl: existingVoidInvoice.pdfUrl,
            issuedAt: existingVoidInvoice.issuedAt,
            dueAt: existingVoidInvoice.dueAt,
            status: existingVoidInvoice.status,
          },
          after: {
            number: updated.number,
            pdfUrl: updated.pdfUrl,
            issuedAt: updated.issuedAt,
            dueAt: updated.dueAt,
            status: updated.status,
          },
        },
      });

      return updated;
    }

    const created = await tx.invoice.create({
      data: {
        bookingId: input.bookingId,
        number: invoiceNumber,
        pdfUrl,
        issuedAt,
        dueAt: input.dueAt ?? null,
        status: "ISSUED",
      },
    });

    await writeAudit(tx, {
      entity: "Invoice",
      entityId: created.id,
      action: "CREATE",
      byProfileId: actor.id,
      diff: { after: { ...created } },
    });

    return created;
  });

  logger.info(
    { invoiceId: invoice.id, invoiceNumber, bookingId: input.bookingId, by: actor.id },
    "invoice.generated",
  );

  return ok(invoice);
}
