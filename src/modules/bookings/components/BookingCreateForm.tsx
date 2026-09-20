"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { TextField } from "@/components/common/form/TextField";
import { SelectField } from "@/components/common/form/SelectField";
import { TextareaField } from "@/components/common/form/TextareaField";
import { FormActions } from "@/components/common/FormActions";
import {
  createDeskBookingSchema,
  type CreateDeskBookingFormValues,
} from "@/modules/bookings/validators/booking";
import { createDeskBookingAction, estimateFareAction } from "@/modules/bookings/actions/booking.actions";
import { lookupCustomerByPhoneAction } from "@/modules/customers/actions/customer.actions";
import { formatMoney } from "@/lib/format/money";
import { phonePlaceholder } from "@/lib/utils/phone";
import { useRequiredInstallSettings } from "@/modules/install/components/InstallSettingsProvider";

type Branch = { id: string; name: string; code: string };
type BookingType = { id: string; name: string };

type Props = {
  branches: Branch[];
  bookingTypes: BookingType[];
};

function defaultPickupAt() {
  const d = new Date();
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function BookingCreateForm({ branches, bookingTypes }: Props) {
  const settings = useRequiredInstallSettings();
  const money = (n: number) =>
    formatMoney(n, { locale: settings.locale, currency: settings.currency });
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [knownCustomer, setKnownCustomer] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<number | null>(null);
  const [estimateKm, setEstimateKm] = useState<number | null>(null);

  const form = useForm<CreateDeskBookingFormValues>({
    resolver: zodResolver(createDeskBookingSchema),
    defaultValues: {
      branchId: branches[0]?.id ?? "",
      bookingTypeId: "",
      phone: "",
      fullName: "",
      pickupAt: defaultPickupAt(),
      pickupAddress: "",
      pickupLandmark: "",
      dropAddress: "",
      dropLandmark: "",
      distanceKm: undefined,
      passengers: 1,
      notes: "",
      quotedFare: undefined,
      tollAmount: 0,
      parkingAmount: 0,
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
    control,
  } = form;

  const phone = useWatch({ control, name: "phone" });
  const branchId = useWatch({ control, name: "branchId" });
  const bookingTypeId = useWatch({ control, name: "bookingTypeId" });
  const distanceKm = useWatch({ control, name: "distanceKm" });
  const pickupAddress = useWatch({ control, name: "pickupAddress" });
  const dropAddress = useWatch({ control, name: "dropAddress" });

  async function lookupPhone() {
    if (!phone || String(phone).replace(/\D/g, "").length < 10) {
      setKnownCustomer(null);
      return;
    }
    const result = await lookupCustomerByPhoneAction({ phone: String(phone) });
    if (result.ok && result.data) {
      setKnownCustomer(result.data.profile.fullName ?? result.data.profile.phone ?? "Existing customer");
      setValue("fullName", result.data.profile.fullName ?? "");
    } else {
      setKnownCustomer(null);
    }
  }

  useEffect(() => {
    if (!branchId || !bookingTypeId) return;
    const timer = window.setTimeout(() => {
      void estimateFareAction({
        bookingTypeId: String(bookingTypeId),
        branchId: String(branchId),
        distanceKm: distanceKm ? Number(distanceKm) : null,
        pickupAddress: pickupAddress ? String(pickupAddress) : undefined,
        dropAddress: dropAddress ? String(dropAddress) : undefined,
      }).then((result) => {
        if (result.ok) {
          setEstimate(result.data.total);
          setEstimateKm(result.data.distanceKm ?? null);
        }
      });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [branchId, bookingTypeId, distanceKm, pickupAddress, dropAddress]);

  const onSubmit = (values: CreateDeskBookingFormValues) => {
    startTransition(async () => {
      const result = await createDeskBookingAction(values);
      if (!result.ok) {
        if (result.error.fieldErrors) {
          Object.entries(result.error.fieldErrors).forEach(([field, msgs]) => {
            setError(field as keyof CreateDeskBookingFormValues, { message: msgs[0] });
          });
        }
        toast.error(result.error.message);
        return;
      }
      toast.success("Booking created.");
      router.push(`/bookings/${result.data.id}`);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <TextField
        label="Mobile"
        required
        inputMode="tel"
        placeholder={phonePlaceholder(settings.phoneRegion)}
        error={errors.phone?.message}
        {...register("phone")}
        onBlur={() => {
          void lookupPhone();
        }}
      />
      {knownCustomer ? (
        <p className="text-sm text-muted">Existing customer: {knownCustomer}</p>
      ) : null}
      <TextField
        label="Customer name"
        required
        placeholder="Name as given on the call"
        error={errors.fullName?.message}
        {...register("fullName")}
      />

      <SelectField
        label="Branch"
        required
        options={branches.map((b) => ({ value: b.id, label: `${b.name} (${b.code})` }))}
        error={errors.branchId?.message}
        {...register("branchId")}
      />
      <SelectField
        label="Ride type"
        required
        placeholder="Select type"
        options={bookingTypes.map((t) => ({ value: t.id, label: t.name }))}
        error={errors.bookingTypeId?.message}
        {...register("bookingTypeId")}
      />

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
        placeholder="Address"
        error={errors.pickupAddress?.message}
        {...register("pickupAddress")}
      />
      <TextField
        label="Pickup landmark"
        placeholder="Opp. metro, near temple"
        error={errors.pickupLandmark?.message}
        {...register("pickupLandmark")}
      />
      <TextField
        label="Drop"
        required
        placeholder="Address"
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

      <p className="text-sm text-default">
        {estimate != null ? (
          <>
            Approx. <span className="font-semibold">{money(Math.round(estimate))}</span>
            {estimateKm != null ? ` for ${estimateKm} km` : ""}
            {". Staff quoted fare below overrides this."}
          </>
        ) : (
          <span className="text-muted">Add type (and km or addresses) to estimate</span>
        )}
      </p>
      <TextField
        label={`Quoted fare (${settings.currency})`}
        type="number"
        min={0}
        hint="Leave blank to use the estimate"
        error={errors.quotedFare?.message}
        {...register("quotedFare")}
      />
      <div className="grid grid-cols-2 gap-4">
        <TextField
          label={`Toll (${settings.currency})`}
          type="number"
          min={0}
          error={errors.tollAmount?.message}
          {...register("tollAmount")}
        />
        <TextField
          label={`Parking (${settings.currency})`}
          type="number"
          min={0}
          error={errors.parkingAmount?.message}
          {...register("parkingAmount")}
        />
      </div>
      <TextareaField
        label="Notes"
        error={errors.notes?.message}
        {...register("notes")}
      />

      <FormActions
        submitLabel="Save booking"
        submitting={pending}
        cancelHref="/bookings"
      />
    </form>
  );
}
