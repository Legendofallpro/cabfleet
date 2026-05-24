/**
 * Parses `q`, `page`, and `pageSize` from raw Next.js searchParams.
 * Plain server-safe function — no client hooks. Import from here in RSC pages,
 * NOT from DataTableToolbar (which carries "use client").
 */
export const DATA_TABLE_PAGE_SIZE = 20;

export function parsePageParams(
  searchParams: Record<string, string | string[] | undefined>,
) {
  const q = typeof searchParams.q === "string" ? searchParams.q : "";
  const pageRaw =
    typeof searchParams.page === "string"
      ? parseInt(searchParams.page, 10)
      : 1;
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  return { q, page, pageSize: DATA_TABLE_PAGE_SIZE };
}
