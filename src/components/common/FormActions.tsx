"use client";

import Link from "next/link";
import React from "react";

export function FormActions({
  cancelHref,
  submitting,
  submitLabel = "Save",
}: {
  cancelHref: string;
  submitting?: boolean;
  submitLabel?: string;
}) {
  return (
    <div className="flex items-center justify-end gap-3 pt-4">
      <Link
        href={cancelHref}
        className="inline-flex h-10 items-center rounded-lg border border-default bg-surface-elevated px-4 text-sm text-default hover:bg-surface-inset"
      >
        Cancel
      </Link>
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
      >
        {submitting ? "Saving..." : submitLabel}
      </button>
    </div>
  );
}
