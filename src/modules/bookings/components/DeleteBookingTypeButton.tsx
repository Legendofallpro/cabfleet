"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteBookingTypeAction } from "@/modules/bookings/actions/booking-type.actions";

export function DeleteBookingTypeButton({ id }: { id: string }) {
  const [phase, setPhase] = useState<null | "confirming">(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (phase === "confirming") {
      setPhase(null);
      startTransition(async () => {
        const result = await deleteBookingTypeAction({ id });
        if (!result.ok) toast.error(result.error.message);
        else toast.success("Type deleted.");
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
