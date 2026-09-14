import { Metadata } from "next";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { BookingCreateForm } from "@/modules/bookings/components/BookingCreateForm";
import { listBranches } from "@/modules/branches/queries/branch";
import { listBookingTypes } from "@/modules/bookings/queries/booking";
import Link from "next/link";

export const metadata: Metadata = { title: "New Booking | CabFleet Admin" };

export default async function NewBookingPage() {
  const [{ rows: branches }, bookingTypes] = await Promise.all([
    listBranches({ pageSize: 100 }),
    listBookingTypes(),
  ]);

  return (
    <div>
      <PageBreadcrumb pageTitle="New Booking" />
      <SurfaceCard>
        <h2 className="mb-6 text-base font-semibold text-default">Phone call booking</h2>

        {bookingTypes.length === 0 && (
          <div className="mb-6 rounded-lg border border-warning bg-warning-subtle px-4 py-3 text-sm text-on-warning-subtle">
            <strong>No booking types found.</strong>{" "}
            <Link href="/settings/booking-types" className="underline">
              Create them in Settings
            </Link>
            .
          </div>
        )}

        <BookingCreateForm branches={branches} bookingTypes={bookingTypes} />
      </SurfaceCard>
    </div>
  );
}
