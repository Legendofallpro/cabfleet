import { Metadata } from "next";
import { RecordPaymentForm } from "@/modules/payments/components/RecordPaymentForm";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

export const metadata: Metadata = { title: "Record Payment | CabFleet Admin" };

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ bookingId?: string; amount?: string }>;
}) {
  const { bookingId = "", amount } = await searchParams;

  return (
    <div>
      <PageBreadcrumb pageTitle="Record Payment" />
      <div className="mx-auto max-w-lg rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="mb-6 text-base font-semibold text-gray-800 dark:text-white/90">
          Record a payment
        </h2>
        <RecordPaymentForm
          bookingId={bookingId}
          defaultAmount={amount ? Number(amount) : undefined}
        />
      </div>
    </div>
  );
}
