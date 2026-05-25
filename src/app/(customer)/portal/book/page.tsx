import { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listBookingTypes } from "@/modules/bookings/queries/list";
import { getOrCreateCustomer } from "@/modules/customers/queries/customer";
import { CustomerBookingForm } from "@/modules/bookings/components/CustomerBookingForm";

export const metadata: Metadata = { title: "Book a Ride | CabFleet" };

export default async function BookPage() {
  const session = await getSessionUser();
  if (!session) redirect("/signin?redirectTo=/portal/book");

  if (session.profile.role !== "CUSTOMER") redirect("/portal");

  const [customer, branch, bookingTypes] = await Promise.all([
    getOrCreateCustomer(session.profile.id),
    db.branch.findFirst({
      where: { deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
    listBookingTypes(),
  ]);

  if (!branch) {
    return (
      <div className="rounded-xl border border-warning-200 bg-warning-50 px-6 py-8 text-center dark:border-warning-800 dark:bg-warning-500/10">
        <p className="font-medium text-warning-700 dark:text-warning-400">
          No branch configured yet.
        </p>
        <p className="mt-1 text-sm text-warning-600 dark:text-warning-500">
          Please contact support to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Book a Ride
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {branch.name} &mdash; fill in the details and we&apos;ll confirm your booking.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        {bookingTypes.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No ride types are available right now. Please try again later or
              contact support.
            </p>
          </div>
        ) : (
          <CustomerBookingForm
            bookingTypes={bookingTypes}
            defaultBranchId={branch.id}
            defaultCustomerId={customer.id}
          />
        )}
      </div>
    </div>
  );
}
