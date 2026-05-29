/**
 * Map booking status transitions to outbox enqueues (Phase 7 W2 §2.3).
 *
 * Called from inside booking-mutation transactions
 * (`transitionBookingStatus`, `claimBooking`) — exactly once per transition.
 * Unknown transitions enqueue nothing (returns silently).
 *
 * The fully-loaded booking with `bookingDetailInclude` is required so we can
 * surface the customer, driver, and vehicle in the rendered templates.
 */
import { BookingStatus, type Prisma } from "@prisma/client";
import type { BookingDetail } from "@/modules/bookings/types";
import { enqueueForChannels } from "@/modules/notifications/services/enqueue";
import type { TemplateId } from "@/modules/notifications/services/templates";
import { toE164 } from "@/lib/utils/phone";

type TransitionLog = {
  prev: BookingStatus;
  next: BookingStatus;
  templateId: TemplateId;
};

const TRANSITION_TEMPLATES: TransitionLog[] = [
  // OPEN_FOR_CLAIM -> CLAIMED is fired from claimBooking; transitionBookingStatus
  // is not called on that path.
  { prev: BookingStatus.OPEN_FOR_CLAIM, next: BookingStatus.CLAIMED, templateId: "BOOKING_CLAIMED" },
  { prev: BookingStatus.PENDING, next: BookingStatus.ASSIGNED, templateId: "BOOKING_ASSIGNED" },
  { prev: BookingStatus.CLAIMED, next: BookingStatus.ASSIGNED, templateId: "BOOKING_ASSIGNED" },
  { prev: BookingStatus.ASSIGNED, next: BookingStatus.IN_PROGRESS, templateId: "BOOKING_STARTED" },
  { prev: BookingStatus.IN_PROGRESS, next: BookingStatus.COMPLETED, templateId: "BOOKING_COMPLETED" },
];

function pickTemplateId(
  prev: BookingStatus,
  next: BookingStatus,
): TemplateId | null {
  if (next === BookingStatus.CANCELLED) return "BOOKING_CANCELLED";
  const match = TRANSITION_TEMPLATES.find(
    (t) => t.prev === prev && t.next === next,
  );
  return match?.templateId ?? null;
}

function buildVariables(booking: BookingDetail, reason?: string) {
  const customerName = booking.customer.profile.fullName ?? "Customer";
  const driverName = booking.assignedDriver?.profile.fullName
    ?? booking.claimedBy?.profile.fullName
    ?? "your driver";
  return {
    bookingRef: booking.id.slice(-6).toUpperCase(),
    customerName,
    driverName,
    pickupAt: booking.pickupAt.toISOString(),
    reason: reason ?? "—",
  };
}

/**
 * Enqueue any notification implied by the transition `(prev -> next)` inside
 * the provided transaction client. Always safe to call — silently returns
 * when the transition has no template, the customer has no contact details,
 * or the booking has no org.
 */
export async function notifyOnTransition(
  tx: Prisma.TransactionClient,
  args: {
    prev: BookingStatus;
    next: BookingStatus;
    booking: BookingDetail;
    reason?: string;
  },
): Promise<void> {
  const templateId = pickTemplateId(args.prev, args.next);
  if (!templateId) return;

  const customerEmail = args.booking.customer.profile.email ?? null;
  const rawPhone = args.booking.customer.profile.phone ?? null;
  const parsedPhone = rawPhone ? toE164(rawPhone) : null;
  const customerPhone =
    parsedPhone && parsedPhone.ok ? parsedPhone.e164 : null;

  await enqueueForChannels(tx, {
    orgId: args.booking.orgId ?? null,
    bookingId: args.booking.id,
    templateId,
    recipients: { email: customerEmail, phone: customerPhone },
    variables: buildVariables(args.booking, args.reason),
  });
}
