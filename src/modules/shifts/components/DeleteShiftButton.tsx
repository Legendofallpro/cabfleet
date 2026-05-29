"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteShiftAction } from "@/modules/shifts/actions/shift.actions";

export function DeleteShiftButton({ id }: { id: string }) {
 const [phase, setPhase] = useState<null | "confirming">(null);
 const [isPending, startTransition] = useTransition();
 const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

 function handleClick() {
  if (phase === "confirming") {
   if (resetTimer.current) clearTimeout(resetTimer.current);
   setPhase(null);
   startTransition(async () => {
    const result = await deleteShiftAction({ id });
    if (!result.ok) {
     toast.error(result.error.message);
    } else {
     toast.success("Shift deleted.");
    }
   });
  } else {
   setPhase("confirming");
   resetTimer.current = setTimeout(() => setPhase(null), 3000);
  }
 }

 return (
  <button
   onClick={handleClick}
   disabled={isPending}
   className="text-xs font-medium text-error hover:underline disabled:opacity-50"
  >
   {isPending ? "Deleting…" : phase === "confirming" ? "Tap again to confirm" : "Delete"}
  </button>
 );
}
