"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { TextField } from "@/components/common/form/TextField";
import { TextareaField } from "@/components/common/form/TextareaField";
import { FormActions } from "@/components/common/FormActions";
import {
  updatePendingBookingSchema,
  type UpdatePendingBookingFormValues,
} from "@/modules/bookings/validators/booking";
import { updatePendingBookingAction } from "@/modules/bookings/actions/booking.actions";

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export type PendingEditDefaults = {
  bookingId: string;
  pickupAtIso: string;
  pickupAddress: string;
  pickupLandmark: string | null;
  dropAddress: string;
  dropLandmark: string | null;
  distanceKm: number | null;
  passengers: number;
  notes: string | null;
  fareEstimate: number | null;
  tollAmount: number;
  parkingAmount: number;
};

export function BookingPendingEditForm({
  defaults,
  cancelHref,
  variant,
}: {
  defaults: PendingEditDefaults;
  cancelHref: string;
  variant: "staff" | "customer";
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UpdatePendingBookingFormValues>({
    resolver: zodResolver(updatePendingBookingSchema),
    defaultValues: {
      bookingId: defaults.bookingId,
      pickupAt: toDatetimeLocal(defaults.pickupAtIso),
      pickupAddress: defaults.pickupAddress,
      pickupLandmark: defaults.pickupLandmark ?? "",
      dropAddress: defaults.dropAddress,
      dropLandmark: defaults.dropLandmark ?? "",
      distanceKm: defaults.distanceKm ?? undefined,
      passengers: defaults.passengers,
      notes: defaults.notes ?? "",
      quotedFare: defaults.fareEstimate ?? undefined,
      tollAmount: defaults.tollAmount,
      parkingAmount: defaults.parkingAmount,
    },
  });

  async function onSubmit(values: UpdatePendingBookingFormValues) {
    const result = await updatePendingBookingAction(values);
    if (!result.ok) {
      if (result.error.fieldErrors) {
        Object.entries(result.error.fieldErrors).forEach(([field, msgs]) => {
          setError(field as keyof UpdatePendingBookingFormValues, { message: msgs[0] });
        });
      }
      toast.error(result.error.message);
      return;
    }
    toast.success("Booking updated.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register("bookingId")} />
      <TextField
        label="Pickup date and time"
        type="datetime-local"
        required
        error={errors.pickupAt?.message}
        {...register("pickupAt")}
      />
      <TextField
        label="Pickup"
        required
        error={errors.pickupAddress?.message}
        {...register("pickupAddress")}
      />
      <TextField
        label="Pickup landmark"
        error={errors.pickupLandmark?.message}
        {...register("pickupLandmark")}
      />
      <TextField
        label="Drop"
        required
        error={errors.dropAddress?.message}
        {...register("dropAddress")}
      />
      <TextField
        label="Drop landmark"
        error={errors.dropLandmark?.message}
        {...register("dropLandmark")}
      />
      <div className="grid grid-cols-2 gap-4">
        <TextField
          label="Distance (km)"
          type="number"
          step="0.1"
          min={0}
          error={errors.distanceKm?.message}
          {...register("distanceKm")}
        />
        <TextField
          label="Passengers"
          type="number"
          min={1}
          max={60}
          required
          error={errors.passengers?.message}
          {...register("passengers")}
        />
      </div>
      <TextareaField label="Notes" error={errors.notes?.message} {...register("notes")} />
      {variant === "staff" && (
        <>
          <TextField
            label="Quoted ₹"
            type="number"
            min={0}
            error={errors.quotedFare?.message}
            {...register("quotedFare")}
          />
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="Toll ₹"
              type="number"
              min={0}
              error={errors.tollAmount?.message}
              {...register("tollAmount")}
            />
            <TextField
              label="Parking ₹"
              type="number"
              min={0}
              error={errors.parkingAmount?.message}
              {...register("parkingAmount")}
            />
          </div>
        </>
      )}
      <FormActions cancelHref={cancelHref} submitting={isSubmitting} submitLabel="Save changes" />
    </form>
  );
}
