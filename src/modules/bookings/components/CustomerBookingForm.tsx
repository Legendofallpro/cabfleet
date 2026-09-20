"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TextField } from "@/components/common/form/TextField";
import { TextareaField } from "@/components/common/form/TextareaField";
import { createBookingSchema, type CreateBookingFormValues } from "@/modules/bookings/validators/booking";
import { createBookingAction, estimateFareAction } from "@/modules/bookings/actions/booking.actions";
import { formatDateTime } from "@/lib/format/datetime";
import { formatMoney } from "@/lib/format/money";
import { useRequiredInstallSettings } from "@/modules/install/components/InstallSettingsProvider";

type BookingType = { id: string; name: string; description?: string | null };

type Props = {
  bookingTypes: BookingType[];
  defaultBranchId: string;
  defaultCustomerId: string;
};

const STEPS = ["Ride type", "Journey", "Review"] as const;

const TYPE_BLURB: Record<string, string> = {
  Local: "Short rides within the city",
  Outstation: "Inter-city trips",
  Rental: "Hire a cab for the day",
  Airport: "To or from the airport",
};

function defaultPickupAt() {
  const d = new Date();
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function RideTypeGlyph({ name }: { name: string }) {
  const common = "h-6 w-6 text-primary";
  if (name === "Airport") {
    return (
      <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 20h18M6 16l4-9 2 3 3-6 4 12" />
      </svg>
    );
  }
  if (name === "Outstation") {
    return (
      <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M13 5l8 7-8 7" />
      </svg>
    );
  }
  if (name === "Rental") {
    return (
      <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 5.25h2.25A2.25 2.25 0 0 1 20.25 7.5v9A2.25 2.25 0 0 1 18 18.75h-2.25m-7.5 0H6A2.25 2.25 0 0 1 3.75 16.5v-9A2.25 2.25 0 0 1 6 5.25h2.25m7.5 13.5v-13.5m-7.5 13.5v-13.5"
        />
      </svg>
    );
  }
  return (
    <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124A17.9 17.9 0 0 0 19.5 9.75H4.5"
      />
    </svg>
  );
}

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-3">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
              i < current
                ? "bg-primary text-primary-foreground"
                : i === current
                  ? "border-2 border-primary bg-surface-elevated text-primary"
                  : "bg-surface-inset text-muted"
            }`}
          >
            {i < current ? (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              i + 1
            )}
          </div>
          <span className={`hidden text-xs font-medium sm:block ${i === current ? "text-primary" : "text-muted"}`}>
            {label}
          </span>
          {i < STEPS.length - 1 && (
            <div className={`h-px w-6 ${i < current ? "bg-primary" : "bg-surface-inset"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function Step1BookingType({
  bookingTypes,
  selected,
  onSelect,
}: {
  bookingTypes: BookingType[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">What kind of ride do you need?</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {bookingTypes.map((bt) => {
          const isSelected = selected === bt.id;
          return (
            <button
              key={bt.id}
              type="button"
              onClick={() => onSelect(bt.id)}
              className={`flex min-h-11 items-start gap-3 rounded-xl border-2 p-4 text-left ${
                isSelected
                  ? "border-primary bg-primary-subtle"
                  : "border-default bg-surface-elevated hover:border-primary"
              }`}
            >
              <RideTypeGlyph name={bt.name} />
              <div>
                <div className={`font-medium ${isSelected ? "text-primary" : "text-default"}`}>{bt.name}</div>
                <div className="mt-0.5 text-xs text-muted">
                  {TYPE_BLURB[bt.name] ?? bt.description ?? ""}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CustomerBookingForm({
  bookingTypes,
  defaultBranchId,
  defaultCustomerId,
}: Props) {
  const settings = useRequiredInstallSettings();
  const money = (n: number) =>
    formatMoney(n, { locale: settings.locale, currency: settings.currency });
  const when = (d: Date) =>
    formatDateTime(d, {
      locale: settings.locale,
      timeZone: settings.timezone,
      dateStyle: "long",
      timeStyle: "short",
    });
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState(0);
  const [estimate, setEstimate] = useState<number | null>(null);
  const [estimateKm, setEstimateKm] = useState<number | null>(null);

  const form = useForm<CreateBookingFormValues>({
    resolver: zodResolver(createBookingSchema),
    defaultValues: {
      branchId: defaultBranchId,
      customerId: defaultCustomerId,
      bookingTypeId: "",
      pickupAt: defaultPickupAt(),
      pickupAddress: "",
      pickupLandmark: "",
      dropAddress: "",
      dropLandmark: "",
      distanceKm: undefined,
      passengers: 1,
      notes: "",
      locationConsent: false,
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    trigger,
    control,
    formState: { errors },
  } = form;

  const bookingTypeId = useWatch({ control, name: "bookingTypeId" }) as string;
  const distanceKm = useWatch({ control, name: "distanceKm" });
  const reviewPickupAt = useWatch({ control, name: "pickupAt" }) as string;
  const reviewPickupAddress = useWatch({ control, name: "pickupAddress" }) as string;
  const reviewPickupLandmark = useWatch({ control, name: "pickupLandmark" });
  const reviewDropAddress = useWatch({ control, name: "dropAddress" }) as string;
  const reviewDropLandmark = useWatch({ control, name: "dropLandmark" });
  const reviewPassengers = useWatch({ control, name: "passengers" }) as number;
  const reviewNotes = useWatch({ control, name: "notes" });

  useEffect(() => {
    if (step !== 2 || !bookingTypeId || !defaultBranchId) return;
    void estimateFareAction({
      bookingTypeId,
      branchId: defaultBranchId,
      distanceKm: distanceKm ? Number(distanceKm) : null,
      pickupAddress: reviewPickupAddress,
      dropAddress: reviewDropAddress,
    }).then((result) => {
      if (result.ok) {
        setEstimate(result.data.total);
        setEstimateKm(result.data.distanceKm ?? null);
      }
    });
  }, [step, bookingTypeId, defaultBranchId, distanceKm, reviewPickupAddress, reviewDropAddress]);

  const goNext = async () => {
    if (step === 0) {
      const ok = await trigger("bookingTypeId");
      if (!ok || !bookingTypeId) {
        toast.error("Please select a ride type to continue.");
        return;
      }
      setStep(1);
      return;
    }
    if (step === 1) {
      const ok = await trigger(["pickupAddress", "dropAddress", "pickupAt", "passengers"]);
      if (!ok) return;
      setStep(2);
    }
  };

  const onSubmit = (values: CreateBookingFormValues) => {
    startTransition(async () => {
      const result = await createBookingAction(values);
      if (!result.ok) {
        if (result.error.fieldErrors) {
          Object.entries(result.error.fieldErrors).forEach(([field, msgs]) => {
            setError(field as keyof CreateBookingFormValues, { message: msgs[0] });
          });
          const step1Fields: (keyof CreateBookingFormValues)[] = [
            "pickupAddress",
            "dropAddress",
            "pickupAt",
            "passengers",
          ];
          const hasStep1Error = Object.keys(result.error.fieldErrors).some((f) =>
            step1Fields.includes(f as keyof CreateBookingFormValues),
          );
          if (hasStep1Error) setStep(1);
        }
        toast.error(result.error.message);
        return;
      }
      toast.success("Booking placed.");
      router.push(`/portal/bookings/${result.data.id}`);
    });
  };

  const selectedType = bookingTypes.find((bt) => bt.id === bookingTypeId);
  const pickupLabel = reviewPickupAt ? when(new Date(reviewPickupAt)) : "—";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <StepIndicator current={step} />

      {step === 0 && (
        <Step1BookingType
          bookingTypes={bookingTypes}
          selected={bookingTypeId}
          onSelect={(id) => setValue("bookingTypeId", id)}
        />
      )}

      {step === 1 && (
        <div className="space-y-5">
          <p className="text-sm text-muted">Tell us about your journey.</p>
          <TextField
            label="Pickup address"
            required
            placeholder="Street, area, city"
            error={errors.pickupAddress?.message}
            {...register("pickupAddress")}
          />
          <TextField
            label="Pickup landmark"
            placeholder="Optional — opp. metro, near temple"
            error={errors.pickupLandmark?.message}
            {...register("pickupLandmark")}
          />
          <TextField
            label="Drop address"
            required
            placeholder="Street, area, city"
            error={errors.dropAddress?.message}
            {...register("dropAddress")}
          />
          <TextField
            label="Drop landmark"
            placeholder="Optional"
            error={errors.dropLandmark?.message}
            {...register("dropLandmark")}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="Pickup date and time"
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
            label="Distance (km)"
            type="number"
            min={0}
            step="0.1"
            hint="Optional — helps estimate fare"
            error={errors.distanceKm?.message}
            {...register("distanceKm")}
          />
          <TextareaField
            label="Notes"
            placeholder="Any special instructions"
            error={errors.notes?.message}
            {...register("notes")}
          />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <p className="text-sm text-muted">Please review your booking before confirming.</p>
          <dl className="divide-y divide-default rounded-xl border border-default">
            {[
              { label: "Ride type", value: selectedType?.name ?? "—" },
              { label: "Pickup", value: reviewPickupAddress || "—" },
              ...(reviewPickupLandmark
                ? [{ label: "Pickup landmark", value: String(reviewPickupLandmark) }]
                : []),
              { label: "Drop", value: reviewDropAddress || "—" },
              ...(reviewDropLandmark
                ? [{ label: "Drop landmark", value: String(reviewDropLandmark) }]
                : []),
              { label: "Date and time", value: pickupLabel },
              { label: "Passengers", value: reviewPassengers ?? 1 },
              ...(distanceKm ? [{ label: "Distance", value: `${distanceKm} km` }] : []),
              ...(reviewNotes ? [{ label: "Notes", value: String(reviewNotes) }] : []),
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-start sm:gap-8">
                <dt className="w-28 shrink-0 text-xs font-medium text-muted">{label}</dt>
                <dd className="text-sm text-default">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-base font-semibold text-default">
            {estimate != null
              ? estimateKm != null
                ? `Approx. ${money(estimate)} for ${estimateKm} km`
                : `Approx. ${money(estimate)}`
              : "Operator will confirm the fare."}
          </p>
          <label className="flex items-start gap-3 rounded-xl border border-default bg-surface-inset p-4 text-sm text-default">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-default text-primary focus:ring-primary"
              {...register("locationConsent")}
            />
            <span className="flex-1">
              <span className="font-medium">Share my live location during this trip.</span>
              <span className="mt-0.5 block text-xs text-muted">
                Lets you see your driver on a map. Points are kept for 30 days, then deleted.
              </span>
            </span>
          </label>
          <button
            type="submit"
            disabled={pending}
            className="h-12 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            {pending ? "Confirming…" : "Confirm booking"}
          </button>
        </div>
      )}

      {step < 2 && (
        <div className="flex items-center justify-between gap-3 pt-2">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="inline-flex h-11 items-center rounded-xl border border-default px-5 text-sm text-default hover:bg-surface-inset"
            >
              Back
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={goNext}
            className="ml-auto inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <button
          type="button"
          onClick={() => setStep(1)}
          className="inline-flex h-11 items-center rounded-xl border border-default px-5 text-sm text-default hover:bg-surface-inset"
        >
          Back
        </button>
      )}
    </form>
  );
}
