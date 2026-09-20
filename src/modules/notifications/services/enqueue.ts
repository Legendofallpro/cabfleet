/**
 * In-transaction outbox enqueue helper (Phase 7 W2 §2.3, §6.2).
 *
 * Called from inside booking-mutation transactions (`transitionBookingStatus`,
 * `claimBooking`) to atomically queue a notification alongside the business
 * state change. The cron at `/api/cron/drain-notifications` is the only
 * caller that hits real providers.
 *
 * The outbox-table pattern is a deliberate choice over `queueMicrotask`:
 *   - Vercel can freeze the function the moment the HTTP response flushes.
 *   - Provider latency must never block the response.
 *   - Retries + exponential backoff need durable state.
 */
import type { Prisma, NotificationChannel } from "@prisma/client";
import { getInstallSettings } from "@/modules/install/queries/install";
import { TEMPLATES, isKnownTemplate } from "@/modules/notifications/services/templates";

export type EnqueueInput = {
  orgId: string | null;
  bookingId?: string | null;
  templateId: string;
  recipient: string;
  channel: NotificationChannel;
  variables: Record<string, string | number>;
  locale?: string;
  urgent?: boolean;
};

/**
 * Insert a single outbox row using the supplied transaction client. Designed
 * to be cheap and side-effect-only — no provider calls, no enrichment, no
 * profile lookups. All gating (opt-out, quiet hours) happens at dispatch
 * time so an outbox row written today still respects prefs updated later.
 */
export async function enqueueNotification(
  tx: Prisma.TransactionClient,
  input: EnqueueInput,
): Promise<void> {
  if (!isKnownTemplate(input.templateId)) {
    throw new Error(`enqueueNotification: unknown template ${input.templateId}`);
  }

  const locale =
    input.locale ?? (await getInstallSettings())?.locale ?? "en-US";

  await tx.notificationOutbox.create({
    data: {
      orgId: input.orgId,
      bookingId: input.bookingId ?? null,
      templateId: input.templateId,
      channel: input.channel,
      recipient: input.recipient,
      payload: {
        variables: input.variables,
        locale,
        urgent: input.urgent ?? TEMPLATES[input.templateId].urgent,
      },
      // PENDING + nextAttemptAt = now → cron picks it up immediately.
      status: "PENDING",
      attempts: 0,
      nextAttemptAt: new Date(),
    },
  });
}

/**
 * Fan a single logical template across every channel it targets, writing one
 * outbox row per (channel, recipient-for-channel). Recipients are passed
 * already-resolved so this function never touches the DB beyond the writes.
 */
export async function enqueueForChannels(
  tx: Prisma.TransactionClient,
  input: {
    orgId: string | null;
    bookingId?: string | null;
    templateId: string;
    recipients: { email?: string | null; phone?: string | null };
    variables: Record<string, string | number>;
    locale?: string;
    urgent?: boolean;
  },
): Promise<void> {
  if (!isKnownTemplate(input.templateId)) {
    throw new Error(`enqueueForChannels: unknown template ${input.templateId}`);
  }
  const tpl = TEMPLATES[input.templateId];

  for (const channel of tpl.channels) {
    const recipient =
      channel === "EMAIL" ? input.recipients.email : input.recipients.phone;
    if (!recipient) continue;
    await enqueueNotification(tx, {
      orgId: input.orgId,
      bookingId: input.bookingId,
      templateId: input.templateId,
      recipient,
      channel,
      variables: input.variables,
      locale: input.locale,
      urgent: input.urgent,
    });
  }
}
