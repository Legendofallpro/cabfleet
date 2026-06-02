"use client";

import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TextField } from "@/components/common/form/TextField";
import { TextareaField } from "@/components/common/form/TextareaField";
import { createBookingSchema, type CreateBookingFormValues } from "@/modules/bookings/validators/booking";
import { createBookingAction } from "@/modules/bookings/actions/booking.actions";

type BookingType = { id: string; name: string; description?: string | null };

type Props = {
 bookingTypes: BookingType[];
 defaultBranchId: string;
 defaultCustomerId: string;
};

const STEPS = ["Ride type", "Journey details", "Review & confirm"] as const;

function defaultPickupAt() {
 const d = new Date();
 d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
 return d.toISOString().slice(0, 16);
}

const dtFmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeStyle: "short" });

// ── Step indicators ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
 return (
  <div className="flex items-center justify-center gap-3">
   {STEPS.map((label, i) => (
    <div key={label} className="flex items-center gap-2">
     <div
      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
       i < current
        ? "bg-primary-subtle0 text-white"
        : i === current
         ? "border-2 border-primary bg-surface-elevated text-primary "
         : "bg-surface-inset text-muted dark:text-muted"
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
     <span
      className={`hidden text-xs font-medium sm:block ${
       i === current ? "text-primary" : "text-muted dark:text-muted"
      }`}
     >
      {label}
     </span>
     {i < STEPS.length - 1 && (
      <div
       className={`h-px w-6 ${
        i < current ? "bg-primary-subtle" : "bg-surface-inset "
       }`}
      />
     )}
    </div>
   ))}
  </div>
 );
}

// ── Step 1: Booking type cards ────────────────────────────────────────────────

function Step1BookingType({
 bookingTypes,
 selected,
 onSelect,
}: {
 bookingTypes: BookingType[];
 selected: string;
 onSelect: (id: string) => void;
}) {
 const icons: Record<string, string> = {
  Local: "🏙️",
  Outstation: "🛣️",
  Rental: "🔑",
  Airport: "✈️",
 };

 const descriptions: Record<string, string> = {
  Local: "Short rides within the city",
  Outstation: "Inter-city trips",
  Rental: "Hire a cab for the day",
  Airport: "To or from the airport",
 };

 return (
  <div className="space-y-4">
   <p className="text-sm text-muted">
    What kind of ride do you need?
   </p>
   <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    {bookingTypes.map((bt) => {
     const isSelected = selected === bt.id;
     return (
      <button
       key={bt.id}
       type="button"
       onClick={() => onSelect(bt.id)}
       className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${
        isSelected
         ? "border-brand-500 bg-primary-subtle dark:border-brand-400 dark:bg-primary-subtle0/10"
         : "border-default bg-surface-elevated hover:border-default  dark:hover:border-primary"
       }`}
      >
       <span className="text-2xl leading-none" aria-hidden>
        {icons[bt.name] ?? "🚕"}
       </span>
       <div>
        <div
         className={`font-medium ${
          isSelected
           ? "text-primary dark:text-primary"
           : "text-default/90"
         }`}
        >
         {bt.name}
        </div>
        <div className="mt-0.5 text-xs text-muted">
         {descriptions[bt.name] ?? bt.description ?? ""}
        </div>
       </div>
       {isSelected && (
        <div className="ml-auto shrink-0 text-primary">
         <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path
           fillRule="evenodd"
           d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
           clipRule="evenodd"
          />
         </svg>
        </div>
       )}
      </button>
     );
    })}
   </div>
  </div>
 );
}

// ── Step 2: Journey details ───────────────────────────────────────────────────

function Step2Journey({
 register,
 errors,
}: {
 register: ReturnType<typeof useForm<CreateBookingFormValues>>["register"];
 errors: Partial<Record<keyof CreateBookingFormValues, { message?: string }>>;
}) {
 return (
  <div className="space-y-5">
   <p className="text-sm text-muted">
    Tell us about your journey.
   </p>

   <TextField
    label="Pickup address"
    required
    placeholder="e.g. 12 MG Road, Bangalore"
    error={errors.pickupAddress?.message}
    {...register("pickupAddress")}
   />

   <TextField
    label="Drop address"
    required
    placeholder="e.g. Kempegowda International Airport"
    error={errors.dropAddress?.message}
    {...register("dropAddress")}
   />

   <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <TextField
     label="Pickup date & time"
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
    placeholder="Optional — helps estimate fare"
    error={errors.distanceKm?.message}
    {...register("distanceKm")}
   />

   <TextareaField
    label="Notes for driver / staff"
    placeholder="Any special instructions…"
    error={errors.notes?.message}
    {...register("notes")}
   />
  </div>
 );
}

// ── Step 3: Review ────────────────────────────────────────────────────────────

function Step3Review({
 bookingTypeId,
 pickupAt,
 pickupAddress,
 dropAddress,
 passengers,
 distanceKm,
 notes,
 bookingTypes,
 pending,
 register,
}: {
 bookingTypeId: string;
 pickupAt: string;
 pickupAddress: string;
 dropAddress: string;
 passengers: string | number;
 distanceKm?: string | number | null;
 notes?: string | null;
 bookingTypes: BookingType[];
 pending: boolean;
 register: ReturnType<typeof useForm<CreateBookingFormValues>>["register"];
}) {
 const selectedType = bookingTypes.find((bt) => bt.id === bookingTypeId);
 const pickupLabel = pickupAt ? dtFmt.format(new Date(pickupAt)) : "—";

 const rows: { label: string; value: React.ReactNode }[] = [
  { label: "Ride type", value: selectedType?.name ?? "—" },
  { label: "Pickup", value: pickupAddress || "—" },
  { label: "Drop", value: dropAddress || "—" },
  { label: "Date & time", value: pickupLabel },
  { label: "Passengers", value: passengers ?? 1 },
  ...(distanceKm ? [{ label: "Distance", value: `${distanceKm} km` }] : []),
  ...(notes ? [{ label: "Notes", value: notes }] : []),
 ];

 return (
  <div className="space-y-5">
   <p className="text-sm text-muted">
    Please review your booking before confirming.
   </p>

   <dl className="divide-y divide-default rounded-xl border border-default ">
    {rows.map(({ label, value }) => (
     <div
      key={label}
      className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-start sm:gap-8"
     >
      <dt className="w-28 shrink-0 text-xs font-medium text-muted">
       {label}
      </dt>
      <dd className="text-sm text-default">{value}</dd>
     </div>
    ))}
   </dl>

   <p className="text-xs text-muted">
    Fare will be calculated and confirmed by staff after booking.
   </p>

   {/* §W5 S15: per-trip location consent. Opt-in only — uncontrolled. */}
   <label className="flex items-start gap-3 rounded-xl border border-default bg-surface-inset p-4 text-sm text-default">
    <input
     type="checkbox"
     className="mt-0.5 h-4 w-4 rounded border-default text-primary focus:ring-primary"
     {...register("locationConsent")}
    />
    <span className="flex-1">
     <span className="font-medium">Share my live location during this trip.</span>
     <span className="mt-0.5 block text-xs text-muted">
      Lets you see your driver on a map in real time. Raw location points
      are kept for 30 days then deleted; you can request deletion sooner
      via support.
     </span>
    </span>
   </label>

   <button
    type="submit"
    disabled={pending}
    className="w-full rounded-xl bg-primary-subtle0 py-3 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50 sm:py-3.5"
   >
    {pending ? "Confirming…" : "Confirm Booking"}
   </button>
  </div>
 );
}

// ── Main form ─────────────────────────────────────────────────────────────────

export function CustomerBookingForm({
 bookingTypes,
 defaultBranchId,
 defaultCustomerId,
}: Props) {
 const router = useRouter();
 const [pending, startTransition] = useTransition();
 const [step, setStep] = useState(0);

 const form = useForm<CreateBookingFormValues>({
  resolver: zodResolver(createBookingSchema),
   defaultValues: {
   branchId: defaultBranchId,
   customerId: defaultCustomerId,
   bookingTypeId: "",
   pickupAt: defaultPickupAt(),
   pickupAddress: "",
   dropAddress: "",
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
 const reviewPickupAt = useWatch({ control, name: "pickupAt" }) as string;
 const reviewPickupAddress = useWatch({ control, name: "pickupAddress" }) as string;
 const reviewDropAddress = useWatch({ control, name: "dropAddress" }) as string;
 const reviewPassengers = useWatch({ control, name: "passengers" }) as number;
 const reviewDistanceKm = useWatch({ control, name: "distanceKm" }) as number | null | undefined;
 const reviewNotes = useWatch({ control, name: "notes" }) as string | null | undefined;

 const handleTypeSelect = (id: string) => {
  setValue("bookingTypeId", id);
 };

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
     // If field errors are on step 1 fields, jump back
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
   toast.success("Booking confirmed! We'll be in touch shortly.");
   router.push("/portal/bookings");
  });
 };

 return (
  <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
   <StepIndicator current={step} />

   <div>
    {step === 0 && (
     <Step1BookingType
      bookingTypes={bookingTypes}
      selected={bookingTypeId}
      onSelect={handleTypeSelect}
     />
    )}
    {step === 1 && (
     <Step2Journey register={register} errors={errors} />
    )}
    {step === 2 && (
     <Step3Review
      bookingTypeId={bookingTypeId}
      pickupAt={reviewPickupAt}
      pickupAddress={reviewPickupAddress}
      dropAddress={reviewDropAddress}
      passengers={reviewPassengers}
      distanceKm={reviewDistanceKm}
      notes={reviewNotes}
      bookingTypes={bookingTypes}
      pending={pending}
      register={register}
     />
    )}
   </div>

   {/* Navigation buttons (back / next) — not shown on step 2 where submit is inline */}
   {step < 2 && (
    <div className="flex items-center justify-between gap-3 pt-2">
     {step > 0 ? (
      <button
       type="button"
       onClick={() => setStep((s) => s - 1)}
       className="inline-flex h-11 items-center gap-1 rounded-xl border border-default px-5 text-sm text-default hover:bg-surface-inset  "
      >
       ← Back
      </button>
     ) : (
      <span />
     )}
     <button
      type="button"
      onClick={goNext}
      className="ml-auto inline-flex h-11 items-center rounded-xl bg-primary-subtle0 px-6 text-sm font-semibold text-white hover:bg-primary-hover"
     >
      Continue →
     </button>
    </div>
   )}

   {step === 2 && (
    <button
     type="button"
     onClick={() => setStep(1)}
     className="inline-flex h-11 items-center gap-1 rounded-xl border border-default px-5 text-sm text-default hover:bg-surface-inset  "
    >
     ← Back
    </button>
   )}
  </form>
 );
}
