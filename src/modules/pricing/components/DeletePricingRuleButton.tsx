"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deletePricingRuleAction } from "@/modules/pricing/actions/pricing-rule.actions";

export function DeletePricingRuleButton({ id }: { id: string }) {
  const [phase, setPhase] = useState<null | "confirming">(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (phase === "confirming") {
      setPhase(null);
      startTransition(async () => {
        const result = await deletePricingRuleAction({ id });
        if (!result.ok) toast.error(result.error.message);
        else toast.success("Rule deleted.");
      });
    } else {
      setPhase("confirming");
      setTimeout(() => setPhase(null), 3000);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="text-xs font-medium text-error hover:underline disabled:opacity-50"
    >
      {isPending ? "Deleting…" : phase === "confirming" ? "Tap again to confirm" : "Delete"}
    </button>
  );
}
