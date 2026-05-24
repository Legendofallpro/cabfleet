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
        className="inline-flex h-10 items-center rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
      >
        Cancel
      </Link>
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex h-10 items-center rounded-lg bg-brand-500 px-5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
      >
        {submitting ? "Saving..." : submitLabel}
      </button>
    </div>
  );
}
