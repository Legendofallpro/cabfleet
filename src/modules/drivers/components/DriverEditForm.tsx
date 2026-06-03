"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { DriverStatus, DriverVerificationStatus } from "@prisma/client";

import { TextField } from "@/components/common/form/TextField";
import { SelectField } from "@/components/common/form/SelectField";
import { FormActions } from "@/components/common/FormActions";
import {
 updateDriverSchema,
 type UpdateDriverFormValues,
} from "@/modules/drivers/validators/driver";
import {
 terminateDriverAction,
 updateDriverAction,
} from "@/modules/drivers/actions/driver.actions";

const STATUS_OPTIONS = Object.values(DriverStatus).map((v) => ({
 value: v,
 label: v.replaceAll("_", " "),
}));
const VERIFY_OPTIONS = Object.values(DriverVerificationStatus).map((v) => ({
 value: v,
 label: v.replaceAll("_", " "),
}));

type Branch = { id: string; name: string; code: string };

export function DriverEditForm({
 branches,
 defaultValues,
}: {
 branches: Branch[];
 defaultValues: UpdateDriverFormValues;
}) {
 const router = useRouter();
 const [terminating, startTerminating] = useTransition();
 const [showTerminate, setShowTerminate] = useState(false);
 const [reason, setReason] = useState("");
 const {
  register,
  handleSubmit,
  setError,
  formState: { errors, isSubmitting },
 } = useForm<UpdateDriverFormValues>({
  resolver: zodResolver(updateDriverSchema),
  defaultValues,
 });

 function onTerminate() {
  // Two-step confirmation: open the panel, type a reason, hit
  // "Confirm termination". The trimmed reason is required by the
  // server action schema (`min(3)`) — guarding here mostly avoids
  // a round-trip for the empty-string case.
  const trimmed = reason.trim();
  if (trimmed.length < 3) {
   toast.error("Termination reason is required (≥3 characters).");
   return;
  }
  startTerminating(async () => {
   const result = await terminateDriverAction({
    id: defaultValues.id,
    reason: trimmed,
   });
   if (!result.ok) {
    toast.error(result.error.message);
    return;
   }
   toast.success("Driver terminated. Sessions revoked.");
   router.push("/drivers");
   router.refresh();
  });
 }

 async function onSubmit(values: UpdateDriverFormValues) {
  const result = await updateDriverAction(values);
  if (!result.ok) {
   if (result.error.fieldErrors) {
    for (const [field, msgs] of Object.entries(result.error.fieldErrors)) {
     setError(field as keyof UpdateDriverFormValues, { message: msgs?.[0] });
    }
   }
   toast.error(result.error.message);
   return;
  }
  toast.success("Driver updated.");
  router.push("/drivers");
  router.refresh();
 }

 return (
  <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
   <input type="hidden" {...register("id")} />
   <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
    <TextField label="Full name" required {...register("fullName")} error={errors.fullName?.message} />
    <TextField label="Phone" required {...register("phone")} error={errors.phone?.message} />
    <SelectField
     label="Branch"
     required
     options={branches.map((b) => ({ value: b.id, label: `${b.name} (${b.code})` }))}
     {...register("branchId")}
     error={errors.branchId?.message}
    />
    <TextField
     label="License number"
     required
     {...register("licenseNumber")}
     error={errors.licenseNumber?.message}
    />
    <TextField
     label="License expiry"
     type="date"
     required
     {...register("licenseExpiry")}
     error={errors.licenseExpiry?.message as string | undefined}
    />
    <SelectField label="Status" options={STATUS_OPTIONS} {...register("status")} error={errors.status?.message} />
    <SelectField label="Verification" options={VERIFY_OPTIONS} {...register("verification")} error={errors.verification?.message} />
    <div className="md:col-span-2">
     <TextField label="Notes" {...register("notes")} error={errors.notes?.message} />
    </div>
   </div>
   <FormActions cancelHref="/drivers" submitting={isSubmitting} />

   <div className="mt-8 rounded-lg border border-error bg-error-subtle p-4">
    <div className="flex items-start justify-between gap-4">
     <div>
      <h3 className="text-sm font-semibold text-on-error-subtle">
       Terminate driver
      </h3>
      <p className="mt-1 text-caption text-on-error-subtle">
       Permanently revokes Supabase sessions and soft-deletes the
       record. The driver cannot sign in again. This action is
       audited and cannot be undone from the UI.
      </p>
     </div>
     {!showTerminate ? (
      <button
       type="button"
       onClick={() => setShowTerminate(true)}
       className="shrink-0 rounded-md bg-error px-3 py-2 text-caption font-medium text-white hover:bg-error/90"
      >
       Terminate…
      </button>
     ) : null}
    </div>
    {showTerminate ? (
     <div className="mt-4 space-y-3">
      <label className="block text-caption font-medium text-on-error-subtle">
       Reason (required, audited)
       <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        className="mt-1 block w-full rounded-md border border-default bg-surface-elevated px-3 py-2 text-sm text-default focus:border-primary focus:outline-none"
        placeholder="e.g. Confirmed misuse of customer data"
        disabled={terminating}
       />
      </label>
      <div className="flex justify-end gap-2">
       <button
        type="button"
        onClick={() => {
         setShowTerminate(false);
         setReason("");
        }}
        disabled={terminating}
        className="rounded-md border border-default px-3 py-2 text-caption font-medium text-default hover:bg-surface"
       >
        Cancel
       </button>
       <button
        type="button"
        onClick={onTerminate}
        disabled={terminating}
        className="rounded-md bg-error px-3 py-2 text-caption font-medium text-white hover:bg-error/90 disabled:opacity-60"
       >
        {terminating ? "Terminating…" : "Confirm termination"}
       </button>
      </div>
     </div>
    ) : null}
   </div>
  </form>
 );
}
