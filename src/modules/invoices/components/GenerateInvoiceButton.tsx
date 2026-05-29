"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { generateInvoiceAction } from "@/modules/invoices/actions/invoice.actions";

interface Props {
 bookingId: string;
}

export function GenerateInvoiceButton({ bookingId }: Props) {
 const router = useRouter();
 const [loading, setLoading] = useState(false);

 const handle = async () => {
  setLoading(true);
  try {
   const result = await generateInvoiceAction({ bookingId });
   if (!result.ok) {
    toast.error(result.error.message);
    return;
   }
   toast.success("Invoice generated and emailed to customer.");
   router.push(`/invoices/${result.data.id}`);
  } finally {
   setLoading(false);
  }
 };

 return (
  <button
   type="button"
   onClick={handle}
   disabled={loading}
   className="inline-flex h-9 items-center rounded-lg border border-default bg-surface-elevated px-4 text-sm font-medium text-default hover:bg-surface-inset disabled:opacity-50"
  >
   {loading ? "Generating…" : "Generate Invoice"}
  </button>
 );
}
