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
  const [loading, setLoading] = useState(false);

  const handleVoid = async () => {
    if (!confirm("Void this invoice? This cannot be undone.")) return;
    setLoading(true);
    try {
      const result = await voidInvoiceAction(invoiceId);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Invoice voided.");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleVoid}
      disabled={loading}
      className="inline-flex h-9 items-center rounded-lg border border-error-200 bg-white px-4 text-sm font-medium text-error-600 hover:bg-error-50 disabled:opacity-50 dark:border-error-700 dark:bg-white/[0.03] dark:text-error-400 dark:hover:bg-error-500/10"
    >
      {loading ? "Voiding…" : "Void Invoice"}
    </button>
  );
}
