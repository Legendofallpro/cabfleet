import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingStatus } from "@prisma/client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { StatusBadge } from "@/components/common/StatusBadge";
import { BookingTimeline } from "@/modules/bookings/components/BookingTimeline";
import { BookingStatusActions } from "@/modules/bookings/components/BookingStatusActions";
import { BookingAssignForm } from "@/modules/bookings/components/BookingAssignForm";
import { getBooking } from "@/modules/bookings/queries/list";
import {
  BOOKING_STATUS_LABEL,
  DISPATCH_MODE_LABEL,
} from "@/modules/bookings/booking.constants";
import { listAssignableDrivers } from "@/modules/drivers/queries/list";
import { listAssignableVehicles } from "@/modules/vehicles/queries/list";
import { getInvoiceForBooking } from "@/modules/invoices/queries/invoice";
import { listPaymentsForBooking } from "@/modules/payments/queries/payment";
import { GenerateInvoiceButton } from "@/modules/invoices/components/GenerateInvoiceButton";

export const metadata: Metadata = { title: "Booking Detail | CabFleet Admin" };

const dtFmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeStyle: "short" });
const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-start sm:gap-4">
      <dt className="w-36 shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">
        {label}
      </dt>
      <dd className="text-sm text-gray-800 dark:text-white/90">{value ?? "—"}</dd>
    </div>
  );
}

const STATUS_TONE: Record<
  BookingStatus,
  "success" | "warning" | "error" | "neutral" | "info"
> = {
  PENDING: "warning",
  OPEN_FOR_CLAIM: "info",
  CLAIMED: "info",
  ASSIGNED: "info",
  DRIVER_EN_ROUTE: "info",
  IN_PROGRESS: "success",
  COMPLETED: "success",
  CANCELLED: "neutral",
  NO_SHOW: "neutral",
  FAILED: "error",
};

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fetch booking + lists needed for the assign form (only when relevant)
  const booking = await getBooking(id);
  if (!booking) notFound();

  const needsAssign =
    booking.status === BookingStatus.PENDING ||
    booking.status === BookingStatus.CLAIMED;

  const [{ rows: drivers }, { rows: vehicles }] = needsAssign
    ? await Promise.all([
        listAssignableDrivers({ pageSize: 200, branchId: booking.branchId }),
        listAssignableVehicles({ pageSize: 200, branchId: booking.branchId }),
      ])
    : [{ rows: [] as Awaited<ReturnType<typeof listAssignableDrivers>>["rows"] }, { rows: [] as Awaited<ReturnType<typeof listAssignableVehicles>>["rows"] }];

  const [invoice, payments] = await Promise.all([
    getInvoiceForBooking(booking.id),
    listPaymentsForBooking(booking.id),
  ]);

  const bookingRef = booking.id.slice(-8).toUpperCase();

  return (
    <div>
      <PageBreadcrumb pageTitle={`Booking #${bookingRef}`} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* ── Left column: summary + assign form ── */}
        <div className="space-y-5 lg:col-span-2">

          {/* Summary card */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
                Booking #{bookingRef}
              </h2>
              <BookingStatusActions bookingId={booking.id} status={booking.status} />
            </div>

            <dl className="divide-y divide-gray-100 dark:divide-gray-800">
              <DetailRow label="Status" value={
                <StatusBadge tone={STATUS_TONE[booking.status]}>
                  {BOOKING_STATUS_LABEL[booking.status]}
                </StatusBadge>
              } />
              <DetailRow label="Customer" value={
                <span>
                  {booking.customer.profile.fullName ?? booking.customer.profile.email}
                  {" "}
                  <span className="text-xs text-gray-500">({booking.customer.profile.email})</span>
                </span>
              } />
              <DetailRow label="Branch" value={`${booking.branch.name} (${booking.branch.code})`} />
              <DetailRow label="Booking type" value={booking.bookingType.name} />
              <DetailRow label="Dispatch mode" value={DISPATCH_MODE_LABEL[booking.dispatchMode]} />
              <DetailRow label="Pickup at" value={dtFmt.format(new Date(booking.pickupAt))} />
              <DetailRow label="Pickup address" value={booking.pickupAddress} />
              <DetailRow label="Drop address" value={booking.dropAddress} />
              <DetailRow label="Passengers" value={booking.passengers} />
              <DetailRow
                label="Distance"
                value={booking.distanceKm != null ? `${Number(booking.distanceKm)} km` : null}
              />
              <DetailRow
                label="Fare estimate"
                value={
                  booking.fareEstimate != null
                    ? currency.format(Number(booking.fareEstimate))
                    : null
                }
              />
              <DetailRow
                label="Final fare"
                value={
                  booking.fareFinal != null
                    ? currency.format(Number(booking.fareFinal))
                    : null
                }
              />
            </dl>
          </section>

          {/* Driver / vehicle summary (when assigned) */}
          {booking.assignedDriver && (
            <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
              <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Assigned resources
              </h3>
              <dl className="divide-y divide-gray-100 dark:divide-gray-800">
                <DetailRow
                  label="Driver"
                  value={
                    <Link
                      href={`/drivers/${booking.assignedDriver.id}`}
                      className="text-brand-600 hover:underline dark:text-brand-400"
                    >
                      {booking.assignedDriver.profile.fullName ??
                        booking.assignedDriver.profile.email}
                    </Link>
                  }
                />
                {booking.assignedVehicle && (
                  <DetailRow
                    label="Vehicle"
                    value={
                      <Link
                        href={`/vehicles/${booking.assignedVehicle.id}`}
                        className="text-brand-600 hover:underline dark:text-brand-400"
                      >
                        {booking.assignedVehicle.registrationNumber} —{" "}
                        {booking.assignedVehicle.make} {booking.assignedVehicle.model}
                      </Link>
                    }
                  />
                )}
                {booking.assignedAt && (
                  <DetailRow
                    label="Assigned at"
                    value={dtFmt.format(new Date(booking.assignedAt))}
                  />
                )}
                {booking.assignedBy && (
                  <DetailRow
                    label="Assigned by"
                    value={booking.assignedBy.fullName ?? booking.assignedBy.email}
                  />
                )}
              </dl>
            </section>
          )}

          {/* Assign / reassign form */}
          {needsAssign && (
            <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
              <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                {booking.assignedDriver ? "Reassign driver & vehicle" : "Assign driver & vehicle"}
              </h3>
              <BookingAssignForm
                bookingId={booking.id}
                drivers={drivers.map((d) => ({
                  id: d.id,
                  licenseNumber: d.licenseNumber,
                  profile: { fullName: d.profile.fullName, email: d.profile.email },
                }))}
                vehicles={vehicles.map((v) => ({
                  id: v.id,
                  registrationNumber: v.registrationNumber,
                  make: v.make,
                  model: v.model,
                }))}
                defaultDriverId={booking.assignedDriver?.id ?? ""}
                defaultVehicleId={booking.assignedVehicle?.id ?? ""}
              />
            </section>
          )}
          {/* Invoice section */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Invoice
              </h3>
              {!invoice && (
                <GenerateInvoiceButton bookingId={booking.id} />
              )}
            </div>
            {invoice ? (
              <dl className="divide-y divide-gray-100 dark:divide-gray-800">
                <DetailRow
                  label="Invoice #"
                  value={
                    <Link
                      href={`/invoices/${invoice.id}`}
                      className="text-brand-600 hover:underline dark:text-brand-400"
                    >
                      {invoice.number}
                    </Link>
                  }
                />
                <DetailRow label="Status" value={invoice.status} />
                {invoice.pdfUrl && (
                  <DetailRow
                    label="PDF"
                    value={
                      <a
                        href={invoice.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-600 hover:underline dark:text-brand-400"
                      >
                        Download
                      </a>
                    }
                  />
                )}
              </dl>
            ) : (
              <p className="text-xs text-gray-400 dark:text-gray-600">
                No invoice generated yet.
              </p>
            )}
          </section>

          {/* Payments section */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Payments
              </h3>
              <Link
                href={`/payments/new?bookingId=${booking.id}&amount=${booking.fareFinal ?? booking.fareEstimate ?? ""}`}
                className="text-xs text-brand-600 hover:underline dark:text-brand-400"
              >
                + Record payment
              </Link>
            </div>
            {payments.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-600">No payments recorded.</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2">
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {p.method} · {p.status}
                    </span>
                    <Link
                      href={`/payments/${p.id}`}
                      className="text-xs font-medium text-gray-800 hover:underline dark:text-white/80"
                    >
                      {currency.format(Number(p.amount))}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* ── Right column: timeline ── */}
        <aside className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <BookingTimeline booking={booking} />
        </aside>
      </div>
    </div>
  );
}
