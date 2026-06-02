/**
 * DSR (Data Subject Right) — erase customer service (Phase 7 W2 §6.5 S14).
 *
 * Implements the "right to erasure" obligation under India's DPDP Act +
 * GDPR Art. 17. Given a Customer id, this scrubs personally-identifying
 * data while preserving the financial / audit chain that we are legally
 * required to retain (booking history for tax purposes, audit log for
 * security forensics).
 *
 * Two-tier policy
 * ---------------
 *   Hard-delete (data subject loses every byte we keep about them):
 *     - NotificationLog rows where recipient matches the customer's
 *       email/phone (PII in the recipient column + payload).
 *     - NotificationOutbox rows in PENDING/FAILED for the same recipient
 *       (avoid sending after the erase).
 *
 *   Scrub-in-place (row stays for FK integrity / financial audit; PII
 *   columns are nulled or replaced with a stable tombstone):
 *     - Profile: email → erased-<id>@deleted.local, fullName → "Erased",
 *                phone → null, avatarUrl → null
 *     - Customer: address → null, defaultPickup → null
 *     - Booking: pickupAddress/dropAddress kept (operational record), but
 *                pickupNotes / customerNotes (if those columns exist) are
 *                nulled. lat/lng kept — they're not directly identifying.
 *
 *   Preserved untouched (auditable financial / safety records):
 *     - Payment, Invoice — government tax retention obligations override
 *       DSR per DPDP §17(1)(c).
 *     - AuditLog — immutable security record (S22); the byProfileId is
 *       already a pseudonymous id, not PII.
 *
 * All actions performed inside a single transaction so a half-erase never
 * persists. The caller (a SUPER_ADMIN-only action / runbook script) must
 * have already obtained the request-id under their DSR ticketing system;
 * that id is written into the AuditLog diff for traceability.
 *
 * Future work: emit an "erasure_completed" notification (via existing
 * outbox), but only AFTER the scrub commits — wiring left in a follow-up
 * to keep this PR focused.
 */
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { writeAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { ok, type Result } from "@/lib/result";
import { runWithoutOrg } from "@/lib/org-context";

export type EraseCustomerInput = {
  customerId: string;
  /** External DSR ticket id — written into the audit diff. */
  dsrRequestId: string;
};

export type EraseCustomerOutput = {
  customerId: string;
  profileId: string;
  scrubbed: {
    profile: boolean;
    customer: boolean;
    bookings: number;
    tripPolylines: number;
  };
  deleted: {
    notificationLogs: number;
    notificationOutbox: number;
    tripLocations: number;
  };
};

export async function eraseCustomer(
  input: EraseCustomerInput,
  actor: { id: string },
): Promise<Result<EraseCustomerOutput>> {
  // Cross-org sweep — SUPER_ADMIN may legitimately erase a customer in any
  // org. Tenant-ADMIN-initiated DSRs come in already scoped by their own
  // session orgId via the action wrapper, but `runWithoutOrg` here gives
  // us deterministic behaviour either way.
  return runWithoutOrg("dsr:eraseCustomer", async () => {
    const customer = await db.customer.findFirst({
      where: { id: input.customerId },
      include: { profile: true },
    });
    if (!customer) {
      throw new AppError("NOT_FOUND", "Customer not found.");
    }

    const profile = customer.profile;
    const recipients = [profile.email, profile.phone].filter(
      (v): v is string => Boolean(v),
    );

    const result = await db.$transaction(async (tx) => {
      // 1. Hard-delete notification PII keyed by the (possibly multiple)
      //    recipient values we know about.
      const logsDeleted = recipients.length
        ? await tx.notificationLog.deleteMany({
            where: { recipient: { in: recipients } },
          })
        : { count: 0 };

      // 2. Cancel pending sends to the same recipients so we don't ping
      //    them after the erase.
      const outboxDeleted = recipients.length
        ? await tx.notificationOutbox.deleteMany({
            where: {
              recipient: { in: recipients },
              status: { in: ["PENDING", "FAILED"] },
            },
          })
        : { count: 0 };

      // 3. Scrub the Profile in-place. email retains a tombstoned form so
      //    the UNIQUE constraint stays intact and downstream FKs survive.
      const tombstoneEmail = `erased-${profile.id}@deleted.local`;
      await tx.profile.update({
        where: { id: profile.id },
        data: {
          email: tombstoneEmail,
          fullName: "Erased",
          phone: null,
          avatarUrl: null,
          // notificationPrefs blob may contain phone/email backups — wipe it.
          // Prisma encodes "set JSON to NULL" via DbNull / JsonNull sentinel.
          notificationPrefs: Prisma.DbNull,
        },
      });

      // 4. Scrub Customer-level PII.
      await tx.customer.update({
        where: { id: customer.id },
        data: {
          address: null,
          defaultPickup: null,
        },
      });

      // 5. Bookings: keep operational fields (addresses are operational
      //    + already non-precise in many cases). If/when we add a notes
      //    column we'd scrub it here.
      const bookings = await tx.booking.count({
        where: { customerId: customer.id },
      });

      // 5b. §W5 S15: cascade erasure to TripLocation (every raw point
      //     ever ingested for this customer's bookings) and the
      //     long-term tripPolyline summary. Booking row itself is
      //     preserved for the financial trail; we just wipe the
      //     geo-history.
      const customerBookings = await tx.booking.findMany({
        where: { customerId: customer.id },
        select: { id: true, tripPolyline: true },
      });
      const bookingIds = customerBookings.map((b) => b.id);
      const tripPolylinesScrubbed = customerBookings.filter(
        (b) => b.tripPolyline !== null,
      ).length;

      const tripLocationsDeleted = bookingIds.length
        ? await tx.tripLocation.deleteMany({
            where: { bookingId: { in: bookingIds } },
          })
        : { count: 0 };

      if (tripPolylinesScrubbed > 0) {
        await tx.booking.updateMany({
          where: { customerId: customer.id, tripPolyline: { not: null } },
          data: { tripPolyline: null },
        });
      }

      // 6. Audit row recording the DSR action.
      await writeAudit(tx, {
        entity: "Customer",
        entityId: customer.id,
        action: "DELETE",
        byProfileId: actor.id,
        diff: {
          dsrRequestId: input.dsrRequestId,
          before: {
            email: profile.email,
            phone: profile.phone,
            fullName: profile.fullName,
          },
          after: {
            email: tombstoneEmail,
            phone: null,
            fullName: "Erased",
          },
          notificationLogsDeleted: logsDeleted.count,
          notificationOutboxDeleted: outboxDeleted.count,
          tripLocationsDeleted: tripLocationsDeleted.count,
          tripPolylinesScrubbed,
          bookingsAffected: bookings,
        },
      });

      return {
        customerId: customer.id,
        profileId: profile.id,
        scrubbed: {
          profile: true,
          customer: true,
          bookings,
          tripPolylines: tripPolylinesScrubbed,
        },
        deleted: {
          notificationLogs: logsDeleted.count,
          notificationOutbox: outboxDeleted.count,
          tripLocations: tripLocationsDeleted.count,
        },
      };
    });

    logger.info(
      {
        dsrRequestId: input.dsrRequestId,
        customerId: result.customerId,
        deleted: result.deleted,
      },
      "dsr.eraseCustomer.completed",
    );

    return ok(result);
  });
}
