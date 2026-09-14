"use client";

import { useState } from "react";
import { toast } from "sonner";

import { WhatsAppShareButton } from "@/modules/bookings/components/WhatsAppShareButton";
import { inviteCustomerToPortalAction } from "@/modules/customers/actions/customer.actions";

type Props = {
  customerId: string;
  phone: string | null;
};

export function InviteCustomerToPortalButton({ customerId, phone }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onInvite() {
    setBusy(true);
    try {
      const result = await inviteCustomerToPortalAction({ customerId });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      setUrl(result.data.url);
      toast.success("Portal invite link ready. Share it with the passenger.");
    } finally {
      setBusy(false);
    }
  }

  if (url) {
    return (
      <WhatsAppShareButton
        phone={phone}
        text={`CabFleet: open your trips here (link expires in 24 hours)\n${url}`}
      />
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void onInvite()}
      className="inline-flex h-10 items-center rounded-lg border border-default px-4 text-sm font-medium text-default hover:bg-surface-inset disabled:opacity-50"
    >
      {busy ? "Creating link…" : "Invite to portal"}
    </button>
  );
}
