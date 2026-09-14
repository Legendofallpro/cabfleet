import { Metadata } from "next";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { listBookingTypesAdmin } from "@/modules/bookings/queries/booking-type";
import { DISPATCH_MODE_LABEL } from "@/modules/bookings/booking.constants";
import { CreateBookingTypeForm } from "@/modules/bookings/components/CreateBookingTypeForm";
import { DeleteBookingTypeButton } from "@/modules/bookings/components/DeleteBookingTypeButton";

export const metadata: Metadata = { title: "Booking types | CabFleet Admin" };
export const dynamic = "force-dynamic";

export default async function BookingTypesSettingsPage() {
  const types = await listBookingTypesAdmin();

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Booking types" />
      <SurfaceCard title={<span className="text-base font-semibold">Add type</span>}>
        <CreateBookingTypeForm />
      </SurfaceCard>
      <SurfaceCard padding="sm" className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-default">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Dispatch</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {types.map((t) => (
              <tr key={t.id} className="border-b border-default">
                <td className="px-4 py-3">
                  <div className="font-medium text-default">{t.name}</div>
                  {t.description ? <div className="text-xs text-muted">{t.description}</div> : null}
                </td>
                <td className="px-4 py-3 text-muted">{DISPATCH_MODE_LABEL[t.defaultDispatchMode]}</td>
                <td className="px-4 py-3">
                  <StatusBadge tone={t.active ? "success" : "neutral"}>
                    {t.active ? "Active" : "Inactive"}
                  </StatusBadge>
                </td>
                <td className="px-4 py-3 text-right">
                  <DeleteBookingTypeButton id={t.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SurfaceCard>
    </div>
  );
}
