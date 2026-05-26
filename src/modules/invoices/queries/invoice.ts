import { db } from "@/lib/db";

const invoiceSelect = {
  id: true,
  bookingId: true,
  number: true,
  pdfUrl: true,
  issuedAt: true,
  dueAt: true,
  status: true,
  createdAt: true,
  booking: {
    select: {
      id: true,
      pickupAddress: true,
      dropAddress: true,
      pickupAt: true,
      fareEstimate: true,
      fareFinal: true,
      customer: {
        select: {
          id: true,
          profile: { select: { fullName: true, email: true, phone: true } },
        },
      },
      branch: { select: { id: true, name: true, code: true } },
    },
  },
} as const;

export type InvoiceRow = Awaited<ReturnType<typeof listInvoices>>["rows"][number];

export async function listInvoices(opts?: { pageSize?: number; page?: number }) {
  const pageSize = opts?.pageSize ?? 30;
  const page = opts?.page ?? 1;
  const skip = (page - 1) * pageSize;

  const [rows, total] = await db.$transaction([
    db.invoice.findMany({
      where: { deletedAt: null },
      orderBy: { issuedAt: "desc" },
      skip,
      take: pageSize,
      select: invoiceSelect,
    }),
    db.invoice.count({ where: { deletedAt: null } }),
  ]);

  return { rows, total };
}

export async function getInvoice(id: string) {
  return db.invoice.findFirst({
    where: { id, deletedAt: null },
    select: invoiceSelect,
  });
}

export async function getInvoiceForBooking(bookingId: string) {
  const invoice = await db.invoice.findFirst({
    where: { bookingId, deletedAt: null, status: { not: "VOID" } },
    select: invoiceSelect,
  });
  return invoice;
}
