import { Metadata } from "next";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { listPricingRules } from "@/modules/pricing/queries/pricing-rule";
import { listActiveBranchesFlat } from "@/modules/branches/queries/branch";
import { listActiveBookingTypesFlat } from "@/modules/bookings/queries/booking";
import { CreatePricingRuleForm } from "@/modules/pricing/components/CreatePricingRuleForm";
import { DeletePricingRuleButton } from "@/modules/pricing/components/DeletePricingRuleButton";
import { formatMoney } from "@/lib/format/money";
import { requireInstallSettings } from "@/modules/install/queries/install";

export const metadata: Metadata = { title: "Pricing | CabFleet Admin" };
export const dynamic = "force-dynamic";

export default async function PricingSettingsPage() {
  const settings = await requireInstallSettings();
  const money = (n: number) =>
    formatMoney(n, { locale: settings.locale, currency: settings.currency });
  const [rules, branches, bookingTypes] = await Promise.all([
    listPricingRules(),
    listActiveBranchesFlat(),
    listActiveBookingTypesFlat(),
  ]);

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Pricing" />
      <SurfaceCard title={<span className="text-base font-semibold">Add rule</span>}>
        {bookingTypes.length === 0 ? (
          <p className="text-sm text-muted">Create a booking type first.</p>
        ) : (
          <CreatePricingRuleForm branches={branches} bookingTypes={bookingTypes} />
        )}
      </SurfaceCard>
      <SurfaceCard padding="sm" className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-default">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Branch</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Base</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Per km</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Per min</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id} className="border-b border-default">
                <td className="px-4 py-3">{rule.bookingType.name}</td>
                <td className="px-4 py-3 text-muted">{rule.branch?.name ?? "All"}</td>
                <td className="px-4 py-3">{money(Number(rule.baseFare))}</td>
                <td className="px-4 py-3">{money(Number(rule.perKm))}</td>
                <td className="px-4 py-3">{money(Number(rule.perMin))}</td>
                <td className="px-4 py-3 text-right">
                  <DeletePricingRuleButton id={rule.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rules.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted">No pricing rules yet.</p>
        ) : null}
      </SurfaceCard>
    </div>
  );
}
