"use client";

import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DispatchMode } from "@prisma/client";

import { TextField } from "@/components/common/form/TextField";
import { SelectField } from "@/components/common/form/SelectField";
import { TextareaField } from "@/components/common/form/TextareaField";
import { FormActions } from "@/components/common/FormActions";
import { createBookingSchema, type CreateBookingFormValues } from "@/modules/bookings/validators/booking";
import { createBookingAction } from "@/modules/bookings/actions/booking.actions";

type Branch = { id: string; name: string; code: string };
type Customer = { id: string; profile: { fullName: string | null; email: string } };
type BookingType = { id: string; name: string; defaultDispatchMode: DispatchMode };

type Props = {
  branches: Branch[];
  customers: Customer[];
  bookingTypes: BookingType[];
};

// Build local-datetime string for "now" rounded to next 15 minutes
function defaultPickupAt() {
  const d = new Date();
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  return d.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"
}

export function BookingCreateForm({ branches, customers, bookingTypes }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<CreateBookingFormValues>({
    resolver: zodResolver(createBookingSchema),
    defaultValues: {
      branchId: branches[0]?.id ?? "",
      customerId: "",
      bookingTypeId: "",
      dispatchMode: DispatchMode.MANUAL,
      pickupAt: defaultPickupAt(),
      pickupAddress: "",
      dropAddress: "",
      distanceKm: undefined,
      passengers: 1,
      notes: "",
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    control,
  } = form;

  // Subscribe to only this field; useWatch is compiler-friendly (no watch())
  const bookingTypeId = useWatch({ control, name: "bookingTypeId" });
  const selectedType = bookingTypes.find((bt) => bt.id === bookingTypeId);

  const onSubmit = (values: CreateBookingFormValues) => {
    startTransition(async () => {
      const result = await createBookingAction(values);
      if (!result.ok) {
        if (result.error.fieldErrors) {
          Object.entries(result.error.fieldErrors).forEach(([field, msgs]) => {
            setError(field as keyof CreateBookingFormValues, { message: msgs[0] });
          });
        }
        toast.error(result.error.message);
        return;
      }
      toast.success("Booking created successfully.");
      router.push(`/bookings/${result.data.id}`);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <SelectField
          label="Branch"
          required
          error={errors.branchId?.message}
          options={branches.map((b) => ({ value: b.id, label: `${b.name} (${b.code})` }))}
          placeholder="Select branch"
          {...register("branchId")}
        />

        <SelectField
          label="Customer"
          required
          error={errors.customerId?.message}
          options={customers.map((c) => ({
            value: c.id,
            label: c.profile.fullName
              ? `${c.profile.fullName} — ${c.profile.email}`
              : c.profile.email,
          }))}
          placeholder="Select customer"
          {...register("customerId")}
        />

        <SelectField
          label="Booking Type"
          required
          error={errors.bookingTypeId?.message}
          placeholder="Select a booking type"
          options={bookingTypes.map((bt) => ({ value: bt.id, label: bt.name }))}
          {...register("bookingTypeId")}
        />

        <SelectField
          label="Dispatch Mode"
          required
          error={errors.dispatchMode?.message}
          options={[
            { value: DispatchMode.MANUAL, label: "Manual (staff assigns)" },
            { value: DispatchMode.CLAIM, label: "Claim (drivers self-assign)" },
            { value: DispatchMode.HYBRID, label: "Hybrid (claim with fallback)" },
          ]}
          hint={selectedType ? `Default for this type: ${selectedType.defaultDispatchMode}` : undefined}
          {...register("dispatchMode")}
        />

        <TextField
          label="Pickup Date & Time"
          type="datetime-local"
          required
          error={errors.pickupAt?.message}
          {...register("pickupAt")}
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

      <TextField
        label="Pickup Address"
        required
        placeholder="e.g. 12 MG Road, Bangalore"
        error={errors.pickupAddress?.message}
        {...register("pickupAddress")}
      />

      <TextField
        label="Drop Address"
        required
        placeholder="e.g. Kempegowda International Airport"
        error={errors.dropAddress?.message}
        {...register("dropAddress")}
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <TextField
          label="Distance (km)"
          type="number"
          min={0}
          step="0.1"
          placeholder="Leave blank if unknown"
          error={errors.distanceKm?.message}
          hint="Used to calculate fare estimate"
          {...register("distanceKm")}
        />
      </div>

      <TextareaField
        label="Notes"
        placeholder="Any special instructions for the driver or staff…"
        error={errors.notes?.message}
        {...register("notes")}
      />

      <FormActions cancelHref="/bookings" submitting={pending} submitLabel="Create Booking" />
    </form>
  );
}
