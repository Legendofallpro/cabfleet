"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { TextField } from "@/components/common/form/TextField";
import { SelectField } from "@/components/common/form/SelectField";
import { completeSetupAction } from "@/modules/install/actions/setup.actions";
import {
  COUNTRY_OPTIONS,
  DEFAULT_COUNTRY,
  defaultsForCountry,
} from "@/modules/install/country-defaults";
import {
  completeSetupSchema,
  type CompleteSetupFormValues,
} from "@/modules/install/validators/setup";

function buildDefaults(country: string): CompleteSetupFormValues {
  const d = defaultsForCountry(country);
  return {
    country,
    currency: d.currency,
    locale: d.locale,
    timezone: d.timezone,
    phoneRegion: d.phoneRegion,
    taxIdLabel: d.taxIdLabel,
    taxRate: d.taxRate,
    setupSecret: "",
  };
}

export function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CompleteSetupFormValues>({
    resolver: zodResolver(completeSetupSchema),
    defaultValues: buildDefaults(DEFAULT_COUNTRY),
  });

  const country = useWatch({ control, name: "country" });
  const countryLabel =
    COUNTRY_OPTIONS.find((o) => o.value === country)?.label ?? country;

  function goToStep2() {
    const selected = country || DEFAULT_COUNTRY;
    reset(buildDefaults(selected));
    setStep(2);
  }

  async function onSubmit(values: CompleteSetupFormValues) {
    const result = await completeSetupAction(values);
    if (!result.ok) {
      if (result.error.fieldErrors) {
        for (const [field, msgs] of Object.entries(result.error.fieldErrors)) {
          setError(field as keyof CompleteSetupFormValues, {
            message: msgs?.[0],
          });
        }
      }
      toast.error(result.error.message);
      return;
    }
    toast.success("Install settings saved.");
    router.push("/signin");
    router.refresh();
  }

  if (step === 1) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium text-primary">CabFleet</p>
          <h1 className="mt-2 text-2xl font-semibold text-default">
            Where does this fleet run?
          </h1>
          <p className="mt-2 text-sm text-muted">
            Choose the country where this deployment operates. Currency, locale,
            and timezone defaults come next.
          </p>
        </div>

        <SelectField
          label="Country"
          required
          options={COUNTRY_OPTIONS}
          {...register("country")}
          error={errors.country?.message}
        />

        <button
          type="button"
          onClick={goToStep2}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <p className="text-sm font-medium text-primary">CabFleet</p>
        <h1 className="mt-2 text-2xl font-semibold text-default">
          Review install defaults
        </h1>
        <p className="mt-2 text-sm text-muted">
          Adjust locale, currency, and tax settings before opening the portals.
        </p>
      </div>

      <TextField
        label="Country"
        readOnly
        value={countryLabel}
        hint="Go back to change the country."
      />
      <input type="hidden" {...register("country")} />

      <TextField
        label="Currency"
        required
        {...register("currency")}
        error={errors.currency?.message}
      />
      <TextField
        label="Locale"
        required
        {...register("locale")}
        error={errors.locale?.message}
      />
      <TextField
        label="Timezone"
        required
        {...register("timezone")}
        error={errors.timezone?.message}
      />
      <TextField
        label="Phone region"
        required
        {...register("phoneRegion")}
        error={errors.phoneRegion?.message}
        hint="ISO 3166-1 alpha-2 code used when parsing mobile numbers."
      />
      <TextField
        label="Tax ID label"
        required
        {...register("taxIdLabel")}
        error={errors.taxIdLabel?.message}
      />
      <TextField
        label="Tax rate (%)"
        type="number"
        required
        min={0}
        max={100}
        {...register("taxRate")}
        error={errors.taxRate?.message as string | undefined}
      />
      <TextField
        label="Setup secret (if your host set SETUP_SECRET)"
        type="password"
        autoComplete="off"
        {...register("setupSecret")}
        error={errors.setupSecret?.message}
      />

      <div className="flex flex-col gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : "Save and continue"}
        </button>
        <button
          type="button"
          onClick={() => {
            setStep(1);
            setValue("country", country || DEFAULT_COUNTRY);
          }}
          className="flex h-12 w-full items-center justify-center rounded-xl border border-default bg-surface-elevated text-sm font-semibold text-default hover:bg-surface-inset"
        >
          Back
        </button>
      </div>
    </form>
  );
}
