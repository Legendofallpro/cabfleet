/**
 * /admin/dsr — SUPER_ADMIN-only Data Subject Right workbench (Phase 7
 * W2 deferred item).
 *
 * The platform operator handles DSR requests centrally. This page is
 * the operator's UI to:
 *   1. Find the customer whose erasure was requested.
 *   2. Trigger `eraseCustomer` against that customer with the external
 *      ticket id pinned into the audit diff.
 *
 * The page itself enforces role at the top so a stray link is harmless;
 * the underlying action enforces SUPER_ADMIN again server-side, so the
 * page-level check is purely a UX nicety.
 */
import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { getSessionUser } from "@/lib/auth/session";
import { listCustomers } from "@/modules/customers/queries/customer-list";
import { EraseCustomerForm } from "@/modules/dsr/components/EraseCustomerForm";

export const metadata: Metadata = { title: "DSR Erase | CabFleet Admin" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string }>;

export default async function DsrPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getSessionUser();
  if (!session || session.profile.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const { q = "" } = await searchParams;
  const trimmed = q.trim();

  // Empty query: render the search box only. Searching with one
  // character would dump the entire customer table — high-trust page,
  // worth the deliberate UX.
  const results =
    trimmed.length >= 2
      ? await listCustomers({ q: trimmed, page: 1, pageSize: 20 })
      : { rows: [], total: 0 };

  return (
    <div>
      <PageBreadcrumb pageTitle="DSR — Right to Erasure" />

      <SurfaceCard title="Find customer">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="flex-1 min-w-[240px] text-caption font-medium text-muted">
            Search by name, email, or phone
            <input
              type="text"
              name="q"
              defaultValue={trimmed}
              placeholder="e.g. ada@example.com"
              className="mt-1 block w-full rounded-md border border-default bg-surface-elevated px-3 py-2 text-sm text-default focus:border-primary focus:outline-none"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-caption font-medium text-white hover:bg-primary-hover"
          >
            Search
          </button>
        </form>
        <p className="mt-3 text-caption text-muted">
          Type at least two characters. This page is restricted to
          SUPER_ADMIN. Every erasure is audited with the DSR ticket id
          and the operator&apos;s profile.
        </p>
      </SurfaceCard>

      {trimmed.length >= 2 ? (
        <div className="mt-5 space-y-4">
          {results.rows.length === 0 ? (
            <SurfaceCard>
              <p className="text-caption text-muted">
                No customers matched &ldquo;{trimmed}&rdquo;.
              </p>
            </SurfaceCard>
          ) : (
            results.rows.map((c) => (
              <SurfaceCard key={c.id}>
                <EraseCustomerForm
                  customerId={c.id}
                  customerEmail={c.profile.email}
                  customerName={c.profile.fullName ?? c.profile.email}
                />
              </SurfaceCard>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
