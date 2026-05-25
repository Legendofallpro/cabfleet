"use client";

import { useTransition } from "react";
import { deleteDispatchRuleAction } from "@/modules/dispatch/actions/dispatch-rule.actions";

export function DeleteDispatchRuleButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Delete this dispatch rule?")) return;
    startTransition(async () => {
      await deleteDispatchRuleAction({ id });
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="text-xs font-medium text-red-500 hover:underline disabled:opacity-50"
    >
      {isPending ? "Deleting…" : "Delete"}
    </button>
  );
}
