import { Metadata } from "next";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { BookingCreateForm } from "@/modules/bookings/components/BookingCreateForm";
import { listBranches } from "@/modules/branches/queries/branch";
import { listCustomers } from "@/modules/customers/queries/customer-list";
import { listBookingTypes } from "@/modules/bookings/queries/booking";

export const metadata: Metadata = { title: "New Booking | CabFleet Admin" };

export default async function NewBookingPage() {
 const [{ rows: branches }, { rows: customers }, bookingTypes] = await Promise.all([
  listBranches({ pageSize: 100 }),
  listCustomers({ pageSize: 500 }),
  listBookingTypes(),
 ]);

 return (
  <div>
   <PageBreadcrumb pageTitle="New Booking" />
   <SurfaceCard>
    <h2 className="mb-6 text-base font-semibold text-default">
     Booking details
    </h2>

    {bookingTypes.length === 0 && (
     <div className="mb-6 rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-700 dark:border-warning-800 dark:bg-warning-500/10 dark:text-warning-400">
      <strong>No booking types found.</strong> Run{" "}
      <code className="rounded bg-warning-100 px-1 font-mono text-xs dark:bg-warning-900">
       npm run db:seed
      </code>{" "}
      to seed the default types, or create them in Settings.
     </div>
    )}

    <BookingCreateForm
     branches={branches}
     customers={customers.map((c) => ({
      id: c.id,
      profile: { fullName: c.profile.fullName, email: c.profile.email },
     }))}
     bookingTypes={bookingTypes}
    />
   </SurfaceCard>
  </div>
 );
}
