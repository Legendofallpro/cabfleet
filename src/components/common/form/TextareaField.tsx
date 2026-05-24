"use client";

import React, { forwardRef } from "react";
import { twMerge } from "tailwind-merge";

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: React.ReactNode;
  error?: string;
  hint?: string;
  required?: boolean;
};

export const TextareaField = forwardRef<HTMLTextAreaElement, Props>(function TextareaField(
  { label, error, hint, required, className, id, ...rest },
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
      <textarea
        ref={ref}
        id={inputId}
        rows={3}
        aria-invalid={error ? "true" : undefined}
        className={twMerge(
          "w-full rounded-lg border bg-transparent px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90",
          error
            ? "border-error-500 focus:border-error-500 focus:ring-error-500/10"
            : "border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:focus:border-brand-800",
          className,
        )}
        {...rest}
      />
      {(error || hint) && (
        <p className={`text-xs ${error ? "text-error-500" : "text-gray-500"}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
});
