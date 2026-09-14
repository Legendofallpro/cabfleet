"use client";

import { useState } from "react";
import { toast } from "sonner";
import Button from "@/components/ui/button/Button";
import { downloadInvoiceAction } from "@/modules/invoices/actions/invoice.actions";

type Props = {
  invoiceId: string;
  label?: string;
};

export function DownloadInvoiceButton({ invoiceId, label = "Download invoice" }: Props) {
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    try {
      const result = await downloadInvoiceAction({ invoiceId });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      window.open(result.data.url, "_blank", "noopener,noreferrer");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button type="button" size="sm" intent="outline" onClick={onClick} disabled={pending}>
      {pending ? "Preparing…" : label}
    </Button>
  );
}
