import React from "react";

interface Field {
  id: string;
  name: string;
  label: string;
  type?: "date" | "select";
  defaultValue?: string;
  options?: { value: string; label: string }[];
}

interface DateRangeFilterBarProps {
  fields: Field[];
  submitLabel?: string;
}

/**
 * Reusable GET-form filter bar for date ranges, period selects, and other
 * filter controls. Used on reports and attendance pages.
 * All styling uses semantic tokens only.
 */
export function DateRangeFilterBar({
  fields,
  submitLabel = "Filter",
}: DateRangeFilterBarProps) {
  return (
    <form method="GET" className="flex flex-wrap items-end gap-3">
      {fields.map((field) => (
        <div key={field.id} className="flex flex-col gap-1">
          <label
            htmlFor={field.id}
            className="text-xs font-medium text-muted"
          >
            {field.label}
          </label>
          {field.type === "select" ? (
            <select
              id={field.id}
              name={field.name}
              defaultValue={field.defaultValue}
              className="rounded-lg border border-default bg-surface-elevated px-3 py-1.5 text-sm text-default focus:border-primary focus:outline-none focus:ring-2 focus:ring-focus"
            >
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={field.id}
              name={field.name}
              type={field.type ?? "date"}
              defaultValue={field.defaultValue}
              className="rounded-lg border border-default bg-surface-elevated px-3 py-1.5 text-sm text-default focus:border-primary focus:outline-none focus:ring-2 focus:ring-focus"
            />
          )}
        </div>
      ))}
      <button
        type="submit"
        className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
      >
        {submitLabel}
      </button>
    </form>
  );
}
