"use client";

import React, { forwardRef } from "react";
import { twMerge } from "tailwind-merge";

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
          className="block text-sm font-medium text-gray-700 dark:text-gray-400"
        >
          {label}
          {required && <span className="text-error-500"> *</span>}
        </label>
      )}
      <select
        ref={ref}
        id={inputId}
        aria-invalid={error ? "true" : undefined}
        className={twMerge(
          "h-11 w-full rounded-lg border bg-transparent px-3 py-2.5 text-sm shadow-theme-xs focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90",
          error
            ? "border-error-500 focus:border-error-500 focus:ring-error-500/10"
            : "border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:focus:border-brand-800",
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
        <p className={`text-xs ${error ? "text-error-500" : "text-gray-500"}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
});
