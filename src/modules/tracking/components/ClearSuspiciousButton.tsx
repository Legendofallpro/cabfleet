"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { clearSuspiciousCounterAction } from "@/modules/tracking/actions/tracking.actions";

/**
 * Renders the "Clear suspicious counter" admin override on the booking
 * detail page when `suspiciousLocationCount > 0`. Two-step interaction
 * (expand → reason → confirm) — clicking the panel button alone never
 * mutates anything.
 *
 * Kept out of the page Server Component because it needs local state +
 * a useTransition for the action call; the page is async RSC.
 */
export function ClearSuspiciousButton({
  bookingId,
  count,
}: {
  bookingId: string;
  count: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  if (count <= 0) return null;

  function submit() {
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      toast.error("Override reason is required (≥3 characters).");
      return;
    }
    start(async () => {
      const result = await clearSuspiciousCounterAction({
        bookingId,
        reason: trimmed,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Counter cleared. The driver can now complete the trip.");
      setOpen(false);
      setReason("");
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-warning bg-warning-subtle p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-on-warning-subtle">
            {count} suspicious location point{count === 1 ? "" : "s"} flagged
          </h3>
          <p className="mt-1 text-caption text-on-warning-subtle">
            The trip cannot be marked complete while points are flagged.
            Review the live-map history before overriding. This action is
            audited.
          </p>
        </div>
        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 rounded-md bg-warning px-3 py-2 text-caption font-medium text-white hover:bg-warning/90"
          >
            Override…
          </button>
        ) : null}
      </div>
      {open ? (
        <div className="mt-4 space-y-3">
          <label className="block text-caption font-medium text-on-warning-subtle">
            Reason (required, audited)
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              disabled={pending}
              className="mt-1 block w-full rounded-md border border-default bg-surface-elevated px-3 py-2 text-sm text-default focus:border-primary focus:outline-none"
              placeholder="e.g. Manually reviewed GPS log, points consistent with tunnel"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setOpen(false);
                setReason("");
              }}
              className="rounded-md border border-default px-3 py-2 text-caption font-medium text-default hover:bg-surface"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={submit}
              className="rounded-md bg-warning px-3 py-2 text-caption font-medium text-white hover:bg-warning/90 disabled:opacity-60"
            >
              {pending ? "Clearing…" : "Confirm override"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
