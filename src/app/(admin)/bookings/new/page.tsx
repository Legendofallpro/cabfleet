import { Metadata } from "next";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { BookingCreateForm } from "@/modules/bookings/components/BookingCreateForm";
import { listBranches } from "@/modules/branches/queries/list";
import { listCustomers } from "@/modules/customers/queries/list";
import { listBookingTypes } from "@/modules/bookings/queries/list";

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
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="mb-6 text-base font-semibold text-gray-800 dark:text-white/90">
          Booking details
        </h2>
        <BookingCreateForm
          branches={branches}
          customers={customers.map((c) => ({
            id: c.id,
            profile: { fullName: c.profile.fullName, email: c.profile.email },
          }))}
          bookingTypes={bookingTypes}
        />
      </div>
    </div>
  );
}
