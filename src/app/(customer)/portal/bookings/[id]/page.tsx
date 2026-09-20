import { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BookingStatus } from "@prisma/client";

import { getSessionUser } from "@/lib/auth/session";
import { getRoleHome } from "@/lib/auth/redirects";
import { env } from "@/lib/env";
import { getCustomerBooking } from "@/modules/customers/queries/customer";
import { StatusBadge } from "@/components/common/StatusBadge";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import {
  CUSTOMER_STATUS_LABEL,
  BOOKING_STATUS_TONE,
  ACTIVE_BOOKING_STATUSES,
  isTerminalStatus,
} from "@/modules/bookings/booking.constants";
import { CancelBookingButton } from "@/modules/bookings/components/CancelBookingButton";
import { BookingPendingEditForm } from "@/modules/bookings/components/BookingPendingEditForm";
import { WhatsAppShareButton } from "@/modules/bookings/components/WhatsAppShareButton";
import { GrantLocationConsentButton } from "@/modules/bookings/components/GrantLocationConsentButton";
import { getInvoiceForBooking } from "@/modules/invoices/queries/invoice";
import { DownloadInvoiceButton } from "@/modules/invoices/components/DownloadInvoiceButton";
import { getBookingOutstanding } from "@/modules/payments/queries/payment";
import { PayNowButton } from "@/modules/payments/components/PayNowButton";
import { listRecentForBooking } from "@/modules/tracking/queries/location";
import LiveTripMapLoader from "@/modules/tracking/components/LiveTripMapLoader";
import { DetailRow } from "@/components/common/DetailRow";
import { formatDateTime } from "@/lib/format/datetime";
import { formatMoney } from "@/lib/format/money";
import { requireInstallSettings } from "@/modules/install/queries/install";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Trip | CabFleet" };

const CANCELLABLE = new Set<BookingStatus>(["PENDING", "OPEN_FOR_CLAIM"]);
const DRIVER_VISIBLE = new Set<BookingStatus>([
  BookingStatus.CLAIMED,
  BookingStatus.ASSIGNED,
  BookingStatus.DRIVER_EN_ROUTE,
  BookingStatus.IN_PROGRESS,
  BookingStatus.COMPLETED,
]);

export default async function CustomerBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSessionUser();
  if (!session) redirect("/signin?redirectTo=/portal/bookings");
  if (session.profile.role !== "CUSTOMER") redirect(getRoleHome(session.profile.role));

  const booking = await getCustomerBooking(id, session.profile.id);
  if (!booking) notFound();

  const invoice = await getInvoiceForBooking(id);
  const due = await getBookingOutstanding(id);
  const bookingRef = booking.id.slice(-8).toUpperCase();
  const status = booking.status as BookingStatus;

  const showLiveMap =
    env.REALTIME_TRACKING_ENABLED &&
    ACTIVE_BOOKING_STATUSES.includes(status) &&
    booking.locationConsentAt !== null;
  const showConsentPrompt =
    booking.locationConsentAt === null && !isTerminalStatus(status);
  const initialPoints = showLiveMap ? await listRecentForBooking(id, 200) : [];
  const driverRecord = booking.assignedDriver ?? booking.claimedBy;
  const showDriver = DRIVER_VISIBLE.has(status) && Boolean(driverRecord);
  const driverPhone = driverRecord?.profile.phone ?? null;
  const extras = Number(booking.tollAmount ?? 0) + Number(booking.parkingAmount ?? 0);
  const settings = await requireInstallSettings();
  const when = (d: Date) =>
    formatDateTime(d, {
      locale: settings.locale,
      timeZone: settings.timezone,
      dateStyle: "long",
      timeStyle: "short",
    });
  const money = (n: number) =>
    formatMoney(n, { locale: settings.locale, currency: settings.currency });

  return (
    <div className="space-y-5">
      <Link href="/portal/bookings" className="text-sm text-primary hover:underline">
        My trips
      </Link>

      <SurfaceCard
        title={
          <span className="text-base font-semibold text-default">Trip {bookingRef}</span>
        }
        actions={
          <StatusBadge tone={BOOKING_STATUS_TONE[status]}>
            {CUSTOMER_STATUS_LABEL[status]}
          </StatusBadge>
        }
      >
        <p className="mb-4 text-lg font-semibold text-default">{CUSTOMER_STATUS_LABEL[status]}</p>
        <dl className="divide-y divide-default">
          <DetailRow label="When" value={when(new Date(booking.pickupAt))} />
          <DetailRow label="From" value={booking.pickupAddress} />
          {booking.pickupLandmark ? (
            <DetailRow label="Pickup landmark" value={booking.pickupLandmark} />
          ) : null}
          <DetailRow label="To" value={booking.dropAddress} />
          {booking.dropLandmark ? (
            <DetailRow label="Drop landmark" value={booking.dropLandmark} />
          ) : null}
          {booking.fareEstimate != null && (
            <DetailRow label="Fare estimate" value={money(Number(booking.fareEstimate))} />
          )}
          {extras > 0 && (
            <DetailRow label="Toll and parking" value={money(extras)} />
          )}
          {booking.fareFinal != null && (
            <DetailRow
              label="Final fare"
              value={
                <span className="font-semibold text-default">
                  {money(Number(booking.fareFinal))}
                </span>
              }
            />
          )}
          {due && due.breakdown.gst > 0 && (
            <DetailRow
              label={`GST ${due.breakdown.gstRate}%`}
              value={money(due.breakdown.gst)}
            />
          )}
          {due && due.outstanding > 0 && (
            <DetailRow
              label="Amount due"
              value={
                <span className="font-semibold text-default">
                  {money(due.outstanding)}
                </span>
              }
            />
          )}
        </dl>
      </SurfaceCard>

      {showDriver && driverRecord && (
        <SurfaceCard title="Your driver">
          <p className="text-sm font-medium text-default">
            {driverRecord.profile.fullName ?? "Driver"}
          </p>
          {booking.assignedVehicle && (
            <p className="mt-0.5 text-sm text-muted">
              {booking.assignedVehicle.make} {booking.assignedVehicle.model} ·{" "}
              {booking.assignedVehicle.registrationNumber}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {driverPhone && (
              <>
                <a
                  href={`tel:${driverPhone}`}
                  className="inline-flex h-11 min-w-28 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
                >
                  Call
                </a>
                <WhatsAppShareButton
                  phone={driverPhone}
                  text={`Hi, this is about CabFleet trip ${bookingRef}.`}
                />
              </>
            )}
          </div>
        </SurfaceCard>
      )}

      {showConsentPrompt && (
        <GrantLocationConsentButton bookingId={booking.id} />
      )}

      {showLiveMap && (
        <SurfaceCard title="Live map">
          <LiveTripMapLoader
            bookingId={booking.id}
            pickup={
              booking.pickupLat != null && booking.pickupLng != null
                ? { lat: Number(booking.pickupLat), lng: Number(booking.pickupLng) }
                : null
            }
            drop={
              booking.dropLat != null && booking.dropLng != null
                ? { lat: Number(booking.dropLat), lng: Number(booking.dropLng) }
                : null
            }
            initialPoints={initialPoints.map((p) => ({
              lat: p.lat,
              lng: p.lng,
              recordedAt: p.recordedAt.toISOString(),
            }))}
            mapTilesUrl={env.NEXT_PUBLIC_MAP_TILES_URL ?? null}
            supabaseUrl={env.NEXT_PUBLIC_SUPABASE_URL}
            supabaseAnonKey={env.NEXT_PUBLIC_SUPABASE_ANON_KEY}
          />
        </SurfaceCard>
      )}

      {CANCELLABLE.has(status) && (
        <CancelBookingButton bookingId={booking.id} />
      )}

      {status === BookingStatus.PENDING && (
        <SurfaceCard title="Edit trip">
          <BookingPendingEditForm
            variant="customer"
            cancelHref={`/portal/bookings/${booking.id}`}
            defaults={{
              bookingId: booking.id,
              pickupAtIso: booking.pickupAt.toISOString(),
              pickupAddress: booking.pickupAddress,
              pickupLandmark: booking.pickupLandmark,
              dropAddress: booking.dropAddress,
              dropLandmark: booking.dropLandmark,
              distanceKm: booking.distanceKm != null ? Number(booking.distanceKm) : null,
              passengers: booking.passengers,
              notes: booking.notes,
              fareEstimate: booking.fareEstimate != null ? Number(booking.fareEstimate) : null,
              tollAmount: Number(booking.tollAmount ?? 0),
              parkingAmount: Number(booking.parkingAmount ?? 0),
            }}
          />
        </SurfaceCard>
      )}

      {env.PAYMENT_GATEWAY === "RAZORPAY" &&
        settings.country === "IN" &&
        due &&
        due.outstanding > 0 && (
        <PayNowButton
          bookingId={booking.id}
          amountRupees={due.outstanding}
          customerName={session.profile.fullName}
          customerEmail={session.profile.email}
          customerPhone={session.profile.phone}
        />
      )}

      {invoice?.pdfUrl && (
        <DownloadInvoiceButton invoiceId={invoice.id} />
      )}
    </div>
  );
}
