"use client";

import { cn } from "@/lib/cn";

type Props = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
  disabled?: boolean;
  id?: string;
};

/**
 * Semantic toggle for boolean prefs. Use with RHF Controller.
 */
export function SwitchField({
  label,
  checked,
  onChange,
  hint,
  disabled = false,
  id,
}: Props) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-1">
      <label
        htmlFor={inputId}
        className={cn(
          "flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-default px-4 py-3",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <span className="text-sm font-medium text-default">{label}</span>
        <button
          type="button"
          id={inputId}
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
            checked ? "bg-primary" : "bg-surface-inset",
          )}
        >
          <span
            className={cn(
              "inline-block h-5 w-5 transform rounded-full bg-surface-elevated shadow-theme-xs transition-transform",
              checked ? "translate-x-5" : "translate-x-0.5",
            )}
          />
        </button>
      </label>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
