"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  approveRefundAction,
  rejectRefundAction,
} from "@/modules/payments/actions/refund.actions";

type Props = {
  refundId: string;
};

/**
 * Approve/reject buttons rendered in the refunds queue. The four-eyes
 * check (requestedById != approvedById) lives in the service layer — if
 * the same admin clicks Approve on a refund they themselves requested,
 * the action returns a FORBIDDEN result and the toast surfaces it.
 */
export function RefundDecisionButtons({ refundId }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onApprove() {
    setBusy(true);
    try {
      const result = await approveRefundAction({ refundId });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Refund approved. Provider call in flight.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onReject() {
    const reason = window.prompt("Reason for rejecting this refund?");
    if (!reason || reason.trim().length < 3) {
      toast.error("Provide a brief reason.");
      return;
    }
    setBusy(true);
    try {
      const result = await rejectRefundAction({ refundId, reason });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Refund rejected.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onApprove}
        disabled={busy}
        className="rounded-md bg-success px-3 py-1 text-xs font-medium text-white hover:bg-success-hover disabled:opacity-50"
      >
        Approve
      </button>
      <button
        type="button"
        onClick={onReject}
        disabled={busy}
        className="rounded-md border border-default px-3 py-1 text-xs font-medium text-default hover:bg-surface-elevated disabled:opacity-50"
      >
        Reject
      </button>
    </div>
  );
}
