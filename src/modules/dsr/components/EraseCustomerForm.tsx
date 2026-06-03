"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { eraseCustomerAction } from "@/modules/dsr/actions/dsr.actions";

/**
 * DSR "right to erasure" form (Phase 7 W2 §6.5 S14).
 *
 * Lives below the customer-search row on /dsr. Three guard rails:
 *   1. The DSR ticket id is required and stored verbatim in the audit
 *      diff — without it the operator can't tie the erasure back to
 *      the original subject request.
 *   2. The customer's full name + email are displayed and the operator
 *      must type the email into a "confirm email" box that must match
 *      exactly. Belt-and-braces against picking the wrong row.
 *   3. The action itself is SUPER_ADMIN-gated (server-side).
 */
export function EraseCustomerForm({
  customerId,
  customerEmail,
  customerName,
}: {
  customerId: string;
  customerEmail: string;
  customerName: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [ticketId, setTicketId] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");

  function submit() {
    if (ticketId.trim().length < 1) {
      toast.error("DSR ticket id is required.");
      return;
    }
    if (confirmEmail.trim().toLowerCase() !== customerEmail.toLowerCase()) {
      toast.error(
        "Confirmation email does not match the selected customer. Aborting.",
      );
      return;
    }
    if (
      !window.confirm(
        `Permanently scrub PII for ${customerName} (${customerEmail})? This cannot be undone.`,
      )
    ) {
      return;
    }
    start(async () => {
      const result = await eraseCustomerAction({
        customerId,
        dsrRequestId: ticketId.trim(),
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Customer PII erased. Audit row written.");
      setTicketId("");
      setConfirmEmail("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-md border border-error bg-error-subtle p-4">
      <div>
        <h4 className="text-sm font-semibold text-on-error-subtle">
          Erase: {customerName}{" "}
          <span className="text-caption font-normal">({customerEmail})</span>
        </h4>
        <p className="mt-1 text-caption text-on-error-subtle">
          Scrubs PII on Profile + Customer rows, hard-deletes notification
          history, drops TripLocation rows and polylines. Financial /
          invoice rows are retained per DPDP §17(1)(c).
        </p>
      </div>
      <label className="block text-caption font-medium text-on-error-subtle">
        DSR ticket id (audited)
        <input
          type="text"
          value={ticketId}
          onChange={(e) => setTicketId(e.target.value)}
          disabled={pending}
          className="mt-1 block w-full rounded-md border border-default bg-surface-elevated px-3 py-2 text-sm text-default focus:border-primary focus:outline-none"
          placeholder="e.g. DSR-2026-0142"
        />
      </label>
      <label className="block text-caption font-medium text-on-error-subtle">
        Re-type the customer email to confirm
        <input
          type="text"
          value={confirmEmail}
          onChange={(e) => setConfirmEmail(e.target.value)}
          disabled={pending}
          autoComplete="off"
          className="mt-1 block w-full rounded-md border border-default bg-surface-elevated px-3 py-2 text-sm text-default focus:border-primary focus:outline-none"
          placeholder={customerEmail}
        />
      </label>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="rounded-md bg-error px-3 py-2 text-caption font-medium text-white hover:bg-error/90 disabled:opacity-60"
        >
          {pending ? "Erasing…" : "Erase PII"}
        </button>
      </div>
    </div>
  );
}
