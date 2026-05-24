"use client";

import { useTransition } from "react";
import Link from "next/link";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";

type Props = {
  searchPlaceholder?: string;
  total: number;
  pageSize?: number;
  /** Optional link the "Create" button points to. */
  createHref?: string;
  createLabel?: string;
};

const PAGE_PARAMS = {
  q: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
};

/**
 * URL-state-driven search + pagination strip. Updates the `q` and `page`
 * query parameters and triggers Next's router to refetch the RSC.
 *
 * The corresponding server page reads these params and passes them to the
 * module's `list` query.
 */
export function DataTableToolbar({
  searchPlaceholder = "Search...",
  total,
  pageSize = 20,
  createHref,
  createLabel = "Add new",
}: Props) {
  const [state, setState] = useQueryStates(PAGE_PARAMS, { shallow: false });
  const [pending, startTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, state.page), totalPages);

  const update = (next: Partial<typeof state>) => {
    startTransition(() => {
      setState(next);
    });
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <input
        type="search"
        value={state.q}
        onChange={(e) => update({ q: e.target.value, page: 1 })}
        placeholder={searchPlaceholder}
        className="h-10 w-full max-w-xs rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
      />
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {total} {total === 1 ? "result" : "results"}
          {pending && " ..."}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => update({ page: page - 1 })}
            disabled={page <= 1}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900"
          >
            Prev
          </button>
          <span className="px-2 text-xs text-gray-500">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => update({ page: page + 1 })}
            disabled={page >= totalPages}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900"
          >
            Next
          </button>
        </div>
        {createHref && (
          <Link
            href={createHref}
            className="inline-flex h-9 items-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600"
          >
            {createLabel}
          </Link>
        )}
      </div>
    </div>
  );
}

export const DATA_TABLE_PAGE_SIZE = 20;

export function parsePageParams(searchParams: Record<string, string | string[] | undefined>) {
  const q = typeof searchParams.q === "string" ? searchParams.q : "";
  const pageRaw = typeof searchParams.page === "string" ? parseInt(searchParams.page, 10) : 1;
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  return { q, page, pageSize: DATA_TABLE_PAGE_SIZE };
}
