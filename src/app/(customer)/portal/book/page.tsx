import { Metadata } from "next";
import { redirect } from "next/navigation";

import { SurfaceCard } from "@/components/common/SurfaceCard";
import { getSessionUser } from "@/lib/auth/session";
import { getRoleHome } from "@/lib/auth/redirects";
import { listBookingTypes } from "@/modules/bookings/queries/booking";
import { getDefaultBranch } from "@/modules/branches/queries/branch";
import { getOrCreateCustomer } from "@/modules/customers/services/customer.service";
import { CustomerBookingForm } from "@/modules/bookings/components/CustomerBookingForm";

export const metadata: Metadata = { title: "Book a Ride | CabFleet" };

export default async function BookPage() {
  const session = await getSessionUser();
  if (!session) redirect("/signin?redirectTo=/portal/book");
  if (session.profile.role !== "CUSTOMER") redirect(getRoleHome(session.profile.role));

  const [customer, branch, bookingTypes] = await Promise.all([
    getOrCreateCustomer(session.profile.id),
    getDefaultBranch(),
    listBookingTypes(),
  ]);

  if (!branch) {
    return (
      <div className="rounded-xl border border-warning bg-warning-subtle px-6 py-8 text-center">
        <p className="font-medium text-on-warning-subtle">No branch configured yet.</p>
        <p className="mt-1 text-sm text-on-warning-subtle">Please contact support to get started.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-default">Book a ride</h1>
        <p className="mt-1 text-sm text-muted">Three steps. We’ll confirm your booking right away.</p>
      </div>
      <SurfaceCard>
        {bookingTypes.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            No ride types are available right now. Please try again later.
          </p>
        ) : (
          <CustomerBookingForm
            bookingTypes={bookingTypes}
            defaultBranchId={branch.id}
            defaultCustomerId={customer.id}
          />
        )}
      </SurfaceCard>
    </div>
  );
}
