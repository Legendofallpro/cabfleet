"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { TextField } from "@/components/common/form/TextField";
import {
  requestRefundSchema,
  type RequestRefundFormValues,
} from "@/modules/payments/validators/refund";
import { requestRefundAction } from "@/modules/payments/actions/refund.actions";
import { formatMoney } from "@/lib/format/money";
import { useRequiredInstallSettings } from "@/modules/install/components/InstallSettingsProvider";

type Props = {
  paymentId: string;
  /** Captured amount in rupees — shown to the operator as the ceiling. */
  capturedAmount: number;
  remainingAmount: number;
};

export function RefundRequestForm({
  paymentId,
  capturedAmount,
  remainingAmount,
}: Props) {
  const settings = useRequiredInstallSettings();
  const money = (n: number) =>
    formatMoney(n, { locale: settings.locale, currency: settings.currency });
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RequestRefundFormValues>({
    resolver: zodResolver(requestRefundSchema),
    defaultValues: {
      paymentId,
      amount: remainingAmount,
      reason: "",
    },
  });

  async function onSubmit(values: RequestRefundFormValues) {
    const result = await requestRefundAction(values);
    if (!result.ok) {
      if (result.error.fieldErrors) {
        for (const [field, messages] of Object.entries(result.error.fieldErrors)) {
          setError(field as keyof RequestRefundFormValues, {
            message: messages?.[0],
          });
        }
      }
      toast.error(result.error.message);
      return;
    }
    toast.success("Refund requested. A second admin must approve it.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register("paymentId")} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TextField
          label={`Amount (${settings.currency})`}
          type="number"
          step="0.01"
          required
          {...register("amount")}
          error={errors.amount?.message}
          hint={`Captured ${money(capturedAmount)} · Remaining ${money(remainingAmount)}`}
        />
        <TextField
          label="Reason"
          required
          placeholder="Customer cancellation, ride not provided…"
          {...register("reason")}
          error={errors.reason?.message}
        />
      </div>
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {isSubmitting ? "Submitting…" : "Request refund"}
        </button>
      </div>
    </form>
  );
}
