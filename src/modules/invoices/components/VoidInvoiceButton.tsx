"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { voidInvoiceAction } from "@/modules/invoices/actions/invoice.actions";

interface Props {
  invoiceId: string;
}

export function VoidInvoiceButton({ invoiceId }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<null | "confirming">(null);
  const [loading, setLoading] = useState(false);

  const handleVoid = async () => {
    if (phase === "confirming") {
      setPhase(null);
      setLoading(true);
      try {
        const result = await voidInvoiceAction({ invoiceId });
        if (!result.ok) {
          toast.error(result.error.message);
          return;
        }
        toast.success("Invoice voided.");
        router.refresh();
      } finally {
        setLoading(false);
      }
    } else {
      setPhase("confirming");
      setTimeout(() => setPhase(null), 3000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleVoid}
      disabled={loading}
      className="inline-flex h-9 items-center rounded-lg border border-error-200 bg-surface-elevated px-4 text-sm font-medium text-error-600 hover:bg-error-subtle disabled:opacity-50 dark:border-error-700 dark:text-error-400"
    >
      {loading
        ? "Voiding…"
        : phase === "confirming"
          ? "Tap again to confirm"
          : "Void Invoice"}
    </button>
  );
}
