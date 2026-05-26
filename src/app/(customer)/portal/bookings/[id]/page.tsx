import { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { BookingStatus } from "@prisma/client";

import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { StatusBadge } from "@/components/common/StatusBadge";
import { BOOKING_STATUS_LABEL } from "@/modules/bookings/booking.constants";
import { CancelBookingButton } from "@/modules/bookings/components/CancelBookingButton";
import { getInvoiceForBooking } from "@/modules/invoices/queries/invoice";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Booking Detail | CabFleet" };

const dtFmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeStyle: "short" });
const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

type StatusTone = "success" | "warning" | "error" | "neutral" | "info";

const STATUS_TONE: Record<BookingStatus, StatusTone> = {
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

const CANCELLABLE = new Set<BookingStatus>(["PENDING", "OPEN_FOR_CLAIM"]);

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-start sm:gap-4">
      <dt className="w-36 shrink-0 text-xs font-medium text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-800">{value ?? "—"}</dd>
    </div>
  );
}

export default async function CustomerBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSessionUser();
  if (!session) redirect("/signin?redirectTo=/portal/bookings");
  if (session.profile.role !== "CUSTOMER") redirect("/portal");

  const booking = await db.booking.findFirst({
    where: { id, deletedAt: null },
    include: {
      customer: { select: { profileId: true } },
      bookingType: { select: { name: true } },
      branch: { select: { name: true, code: true } },
      assignedDriver: {
        include: {
          profile: { select: { fullName: true } },
        },
      },
      assignedVehicle: {
        select: { registrationNumber: true, make: true, model: true },
      },
    },
  });

  // Guard: booking must exist and belong to this customer
  if (!booking || booking.customer.profileId !== session.profile.id) {
    notFound();
  }

  const invoice = await getInvoiceForBooking(id);

  const bookingRef = booking.id.slice(-8).toUpperCase();

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/portal/bookings"
          className="text-sm text-brand-600 hover:underline"
        >
          ← My Bookings
        </Link>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        {/* Header */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Booking #{bookingRef}</h1>
            <p className="mt-0.5 text-xs text-gray-500">
              Booked {dtFmt.format(new Date(booking.createdAt))}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge tone={STATUS_TONE[booking.status as BookingStatus]}>
              {BOOKING_STATUS_LABEL[booking.status as BookingStatus]}
            </StatusBadge>
            {CANCELLABLE.has(booking.status as BookingStatus) && (
              <CancelBookingButton bookingId={booking.id} />
            )}
          </div>
        </div>

        {/* Details */}
        <dl className="divide-y divide-gray-100">
          <Row label="Booking type" value={booking.bookingType.name} />
          <Row label="Branch" value={`${booking.branch.name} (${booking.branch.code})`} />
          <Row label="Pickup at" value={dtFmt.format(new Date(booking.pickupAt))} />
          <Row label="From" value={booking.pickupAddress} />
          <Row label="To" value={booking.dropAddress} />
          <Row label="Passengers" value={booking.passengers} />
          {booking.distanceKm != null && (
            <Row label="Distance" value={`${Number(booking.distanceKm)} km`} />
          )}
          {booking.fareEstimate != null && (
            <Row
              label="Fare estimate"
              value={currency.format(Number(booking.fareEstimate))}
            />
          )}
          {booking.fareFinal != null && (
            <Row
              label="Final fare"
              value={
                <span className="font-semibold text-gray-900">
                  {currency.format(Number(booking.fareFinal))}
                </span>
              }
            />
          )}
        </dl>

        {/* Assigned driver */}
        {booking.assignedDriver && (
          <div className="mt-5 rounded-xl bg-gray-50 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Your Driver
            </p>
            <p className="text-sm font-medium text-gray-800">
              {booking.assignedDriver.profile.fullName ?? "Driver"}
            </p>
            {booking.assignedVehicle && (
              <p className="mt-0.5 text-xs text-gray-500">
                {booking.assignedVehicle.make} {booking.assignedVehicle.model} —{" "}
                {booking.assignedVehicle.registrationNumber}
              </p>
            )}
          </div>
        )}

        {/* Invoice download */}
        {invoice && invoice.pdfUrl && (
          <div className="mt-5 flex items-center justify-between rounded-xl border border-brand-100 bg-brand-50 p-4">
            <div>
              <p className="text-sm font-medium text-brand-800">Invoice {invoice.number}</p>
              <p className="mt-0.5 text-xs text-brand-600">
                Issued {dtFmt.format(new Date(invoice.issuedAt))}
              </p>
            </div>
            <a
              href={invoice.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Download Invoice
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
