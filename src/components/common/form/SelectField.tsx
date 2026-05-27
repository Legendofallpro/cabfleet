"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/cn";

type Option = { value: string; label: string; disabled?: boolean };

type Props = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> & {
  label?: React.ReactNode;
  error?: string;
  hint?: string;
  required?: boolean;
  options: Option[];
  placeholder?: string;
};

export const SelectField = forwardRef<HTMLSelectElement, Props>(function SelectField(
  { label, error, hint, required, className, id, options, placeholder, ...rest },
  ref,
) {
  const inputId = id ?? rest.name;
  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-default"
        >
          {label}
          {required && <span className="text-error"> *</span>}
        </label>
      )}
      <select
        ref={ref}
        id={inputId}
        aria-invalid={error ? "true" : undefined}
        className={cn(
          "h-11 w-full rounded-lg border bg-transparent px-3 py-2.5 text-sm shadow-theme-xs focus:outline-hidden focus:ring-3",
          error
            ? "border-error focus:border-error focus:ring-error/10"
            : "border-default focus:border-primary focus:ring-focus",
          className,
        )}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      {(error || hint) && (
        <p className={cn("text-xs", error ? "text-error" : "text-muted")}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
});
