import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { ok, type Result } from "@/lib/result";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  INVOICE_BUCKET,
  SIGNED_URL_EXPIRY_SECS,
  invoiceStoragePath,
  isHttpUrl,
} from "@/modules/invoices/invoice-storage";

type Actor = { id: string; role: Role };

export async function mintInvoiceDownloadUrl(
  invoiceId: string,
  actor: Actor,
): Promise<Result<{ url: string }>> {
  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, deletedAt: null, status: { not: "VOID" } },
    select: {
      id: true,
      number: true,
      pdfUrl: true,
      orgId: true,
      booking: {
        select: {
          customer: { select: { profileId: true } },
        },
      },
    },
  });
  if (!invoice?.pdfUrl) {
    throw new AppError("NOT_FOUND", "Invoice PDF is not available.");
  }

  if (actor.role === "CUSTOMER") {
    if (invoice.booking.customer.profileId !== actor.id) {
      throw new AppError("NOT_FOUND", "Invoice PDF is not available.");
    }
  } else if (actor.role === "DRIVER") {
    throw new AppError("FORBIDDEN", "You do not have access to this resource.");
  }

  const candidates = [
    isHttpUrl(invoice.pdfUrl) ? null : invoice.pdfUrl,
    invoice.orgId ? invoiceStoragePath(invoice.orgId, invoice.id) : null,
    `${invoice.number}.pdf`,
  ].filter((p): p is string => Boolean(p));

  const supabase = getSupabaseAdminClient();
  for (const path of candidates) {
    const { data, error } = await supabase.storage
      .from(INVOICE_BUCKET)
      .createSignedUrl(path, SIGNED_URL_EXPIRY_SECS);
    if (!error && data?.signedUrl) {
      return ok({ url: data.signedUrl });
    }
  }

  throw new AppError("INTERNAL", "Failed to generate PDF download URL.");
}
