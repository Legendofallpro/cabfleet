"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/cn";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: React.ReactNode;
  error?: string;
  hint?: string;
  required?: boolean;
};

/**
 * RHF-friendly text input. Accepts refs and all standard input props so
 * `{...register("x")}` works out of the box.
 */
export const TextField = forwardRef<HTMLInputElement, Props>(function TextField(
  { label, error, hint, required, className, id, ...rest },
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
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? "true" : undefined}
        className={cn(
          "h-11 w-full rounded-lg border bg-transparent px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-muted focus:outline-hidden focus:ring-3",
          error
            ? "border-error focus:border-error focus:ring-error/10"
            : "border-default focus:border-primary focus:ring-focus",
          className,
        )}
        {...rest}
      />
      {(error || hint) && (
        <p className={cn("text-xs", error ? "text-error" : "text-muted")}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
});
