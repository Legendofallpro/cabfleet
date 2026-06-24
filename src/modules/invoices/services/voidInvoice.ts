import { db } from "@/lib/db";
import { err, ok, type Result } from "@/lib/result";
import { writeAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

export type VoidInvoiceResult = { id: string; bookingId: string };

export async function voidInvoice(
  invoiceId: string,
  actor: { id: string },
): Promise<Result<VoidInvoiceResult>> {
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
    await writeAudit(tx, {
      entity: "Invoice",
      entityId: invoiceId,
      action: "STATUS_CHANGE",
      byProfileId: actor.id,
      diff: { before: { status: invoice.status }, after: { status: "VOID" } },
    });
  });

  logger.info({ invoiceId, actor: actor.id }, "invoice.voided");

  return ok({ id: invoiceId, bookingId: invoice.bookingId });
}
